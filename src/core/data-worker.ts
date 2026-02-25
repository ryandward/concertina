/**
 * DataWorker — Core Stability Engine
 *
 * Entry point for a dedicated Web Worker. All ingestion, columnar storage,
 * layout computation, and backpressure management live here.
 * The main thread never touches raw data records.
 *
 * Bundler note: add "src/core/data-worker.ts" as a separate tsup entry so it
 * emits as "dist/core/data-worker.js". The orchestrator references it via:
 *   new Worker(new URL("./data-worker.js", import.meta.url), { type: "module" })
 */

// Locally shadow `self` with a precise worker-scope type.
// DedicatedWorkerGlobalScope lives in lib.webworker.d.ts which conflicts with
// lib.dom.d.ts when both are in scope; an inline declaration avoids that clash.
declare const self: {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage(msg: unknown, transfer?: Transferable[]): void;
  close(): void;
};

import {
  BATCH_MAGIC,
  CELL_H_PADDING,
  TYPE_TAG,
  TAG_TO_TYPE,
  type ColumnSchema,
  type ResolvedColumn,
  type ViewportLayout,
  type DataWindow,
  type WorkerCommand,
  type WorkerEvent,
  type BackpressureStrategy,
  type BackpressureState,
  type ColumnDataType,
  asRowIndex,
  asPixelSize,
  asMs,
  asBatchSeq,
} from "./types";

// ─── Ring Buffer (frame-history accumulator) ──────────────────────────────────

class RingBuffer {
  private readonly data: Float64Array;
  private head = 0;
  private count = 0;

  constructor(private readonly capacity: number) {
    this.data = new Float64Array(capacity);
  }

  push(value: number): void {
    this.data[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  mean(): number {
    if (this.count === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.count; i++) sum += this.data[i]!;
    return sum / this.count;
  }

  get length(): number {
    return this.count;
  }
}

// ─── Growable Columnar Storage ────────────────────────────────────────────────

type NumericTypedArray = Float64Array | Int32Array | Uint32Array | Uint8Array;

class NumericColumn {
  private buf: NumericTypedArray;
  private length = 0;

  constructor(
    private readonly colType: "f64" | "i32" | "u32" | "bool" | "timestamp_ms",
    initialCapacity = 8192,
  ) {
    this.buf = this.alloc(initialCapacity);
  }

  private alloc(n: number): NumericTypedArray {
    switch (this.colType) {
      case "f64":
      case "timestamp_ms": return new Float64Array(n);
      case "i32":          return new Int32Array(n);
      case "u32":          return new Uint32Array(n);
      case "bool":         return new Uint8Array(n);
    }
  }

  append(src: NumericTypedArray): void {
    const needed = this.length + src.length;
    if (needed > this.buf.length) {
      const next = this.alloc(Math.max(this.buf.length * 2, needed));
      (next as Float64Array).set(this.buf.subarray(0, this.length) as Float64Array);
      this.buf = next;
    }
    (this.buf as Float64Array).set(src as Float64Array, this.length);
    this.length += src.length;
  }

  /** Returns a copy of rows [startRow, startRow+count) as ArrayBuffer. */
  copySlice(startRow: number, count: number): ArrayBuffer {
    const end = Math.min(startRow + count, this.length);
    const actual = Math.max(0, end - startRow);
    return this.buf.slice(startRow, startRow + actual).buffer as ArrayBuffer;
  }

  get rowCount(): number {
    return this.length;
  }
}

class Utf8Column {
  /** Absolute byte offset of each row's string start. offsets[rowCount] = total bytes. */
  private offsets: Uint32Array;
  private offsetLen = 1; // offsets[0] = 0
  private bytes: Uint8Array;
  private bytesLen = 0;

  constructor(rowCapacity = 8192, bytesCapacity = 131072) {
    this.offsets = new Uint32Array(rowCapacity + 1);
    this.bytes   = new Uint8Array(bytesCapacity);
    this.offsets[0] = 0;
  }

  append(srcOffsets: Uint32Array, srcBytes: Uint8Array, rowCount: number): void {
    const addedBytes = srcOffsets[rowCount]!;
    const baseAbsolute = this.offsets[this.offsetLen - 1]!;

    if (this.offsetLen + rowCount > this.offsets.length) {
      const next = new Uint32Array(Math.max(this.offsets.length * 2, this.offsetLen + rowCount + 1));
      next.set(this.offsets.subarray(0, this.offsetLen));
      this.offsets = next;
    }

    if (this.bytesLen + addedBytes > this.bytes.length) {
      const next = new Uint8Array(Math.max(this.bytes.length * 2, this.bytesLen + addedBytes));
      next.set(this.bytes.subarray(0, this.bytesLen));
      this.bytes = next;
    }

    this.bytes.set(srcBytes.subarray(0, addedBytes), this.bytesLen);
    this.bytesLen += addedBytes;

    for (let i = 0; i < rowCount; i++) {
      this.offsets[this.offsetLen + i] = baseAbsolute + srcOffsets[i + 1]!;
    }
    this.offsetLen += rowCount;
  }

  /** Returns { offsets: ArrayBuffer, bytes: ArrayBuffer } for rows [startRow, startRow+count). */
  copySlice(startRow: number, count: number): { offsets: ArrayBuffer; bytes: ArrayBuffer } {
    const end    = Math.min(startRow + count, this.rowCount);
    const actual = Math.max(0, end - startRow);
    const base   = this.offsets[startRow]!;
    const limit  = this.offsets[startRow + actual]!;
    const byteLen = limit - base;

    const newOffsets = new Uint32Array(actual + 1);
    for (let i = 0; i <= actual; i++) {
      newOffsets[i] = this.offsets[startRow + i]! - base;
    }

    const newBytes = this.bytes.slice(base, base + byteLen);
    return {
      offsets: newOffsets.buffer as ArrayBuffer,
      bytes:   newBytes.buffer  as ArrayBuffer,
    };
  }

  get rowCount(): number {
    return this.offsetLen - 1;
  }
}

/**
 * ListUtf8Column — growable columnar storage for list<utf8>.
 *
 * Three-level index:
 *   rowOffsets[i..i+1)  → item index range for row i
 *   itemOffsets[j..j+1) → byte range in `bytes` for item j
 *   bytes               → UTF-8 string data (all items concatenated)
 */
class ListUtf8Column {
  private rowOffsets:  Uint32Array;
  private rowOffLen    = 1; // rowOffsets[0] = 0
  private itemOffsets: Uint32Array;
  private itemOffLen   = 1; // itemOffsets[0] = 0
  private bytes:       Uint8Array;
  private bytesLen     = 0;

  constructor(rowCapacity = 8192, itemCapacity = 65536, bytesCapacity = 524288) {
    this.rowOffsets  = new Uint32Array(rowCapacity + 1);
    this.itemOffsets = new Uint32Array(itemCapacity + 1);
    this.bytes       = new Uint8Array(bytesCapacity);
    this.rowOffsets[0]  = 0;
    this.itemOffsets[0] = 0;
  }

  append(
    totalItems:   number,
    srcRowOff:    Uint32Array, // length rowCount+1, item indices relative to batch start
    srcItemOff:   Uint32Array, // length totalItems+1, byte offsets relative to batch start
    srcBytes:     Uint8Array,
    rowCount:     number,
  ): void {
    const baseItemIdx  = this.itemOffLen - 1; // item count stored before this batch
    const baseBytesLen = this.bytesLen;
    const addedBytes   = totalItems > 0 ? srcItemOff[totalItems]! : 0;

    // Grow rowOffsets
    if (this.rowOffLen + rowCount > this.rowOffsets.length) {
      const next = new Uint32Array(Math.max(this.rowOffsets.length * 2, this.rowOffLen + rowCount + 1));
      next.set(this.rowOffsets.subarray(0, this.rowOffLen));
      this.rowOffsets = next;
    }

    // Grow itemOffsets
    if (this.itemOffLen + totalItems > this.itemOffsets.length) {
      const next = new Uint32Array(Math.max(this.itemOffsets.length * 2, this.itemOffLen + totalItems + 1));
      next.set(this.itemOffsets.subarray(0, this.itemOffLen));
      this.itemOffsets = next;
    }

    // Grow bytes
    if (baseBytesLen + addedBytes > this.bytes.length) {
      const next = new Uint8Array(Math.max(this.bytes.length * 2, baseBytesLen + addedBytes));
      next.set(this.bytes.subarray(0, baseBytesLen));
      this.bytes = next;
    }

    // Copy bytes
    this.bytes.set(srcBytes.subarray(0, addedBytes), baseBytesLen);
    this.bytesLen += addedBytes;

    // Remap item offsets: batch-relative byte offsets → store-absolute
    for (let j = 0; j < totalItems; j++) {
      this.itemOffsets[this.itemOffLen + j] = baseBytesLen + srcItemOff[j + 1]!;
    }
    this.itemOffLen += totalItems;

    // Remap row offsets: batch-relative item indices → store-absolute
    for (let r = 0; r < rowCount; r++) {
      this.rowOffsets[this.rowOffLen + r] = baseItemIdx + srcRowOff[r + 1]!;
    }
    this.rowOffLen += rowCount;
  }

  /** Returns the wire-format sub-buffers for rows [startRow, startRow+count). */
  copySlice(startRow: number, count: number): {
    totalItems: ArrayBuffer;
    rowOffsets: ArrayBuffer;
    itemOffsets: ArrayBuffer;
    bytes: ArrayBuffer;
  } {
    const end    = Math.min(startRow + count, this.rowCount);
    const actual = Math.max(0, end - startRow);

    const baseItemIdx = this.rowOffsets[startRow]!;
    const endItemIdx  = this.rowOffsets[startRow + actual]!;
    const sliceItems  = endItemIdx - baseItemIdx;

    const baseByteIdx = sliceItems > 0 ? this.itemOffsets[baseItemIdx]! : 0;
    const endByteIdx  = sliceItems > 0 ? this.itemOffsets[endItemIdx]!  : 0;

    const header         = new Uint32Array([sliceItems]);
    const newRowOffsets  = new Uint32Array(actual + 1);
    const newItemOffsets = new Uint32Array(sliceItems + 1);
    const newBytes       = this.bytes.slice(baseByteIdx, endByteIdx);

    for (let r = 0; r <= actual; r++) {
      newRowOffsets[r] = this.rowOffsets[startRow + r]! - baseItemIdx;
    }
    for (let j = 0; j <= sliceItems; j++) {
      newItemOffsets[j] = this.itemOffsets[baseItemIdx + j]! - baseByteIdx;
    }

    return {
      totalItems: header.buffer         as ArrayBuffer,
      rowOffsets: newRowOffsets.buffer  as ArrayBuffer,
      itemOffsets: newItemOffsets.buffer as ArrayBuffer,
      bytes:      newBytes.buffer       as ArrayBuffer,
    };
  }

  get rowCount(): number {
    return this.rowOffLen - 1;
  }
}

type AnyColumn = NumericColumn | Utf8Column | ListUtf8Column;

// ─── Batch Parser ──────────────────────────────────────────────────────────────

interface ParsedColData {
  type: ColumnDataType;
  // Numeric columns
  data: NumericTypedArray | null;
  // utf8 columns
  utf8Offsets?: Uint32Array;
  utf8Bytes?:   Uint8Array;
  // list_utf8 columns
  listTotalItems?: number;
  listRowOffsets?: Uint32Array;
  listItemOffsets?: Uint32Array;
  listBytes?: Uint8Array;
}

interface ParsedBatch {
  seq:     number;
  rowCount: number;
  columns: ParsedColData[];
}

function parseBatch(buffer: ArrayBuffer): ParsedBatch {
  const view   = new DataView(buffer);
  let cursor   = 0;

  const magic = view.getUint32(cursor, true); cursor += 4;
  if (magic !== BATCH_MAGIC) {
    throw new Error(`Invalid batch magic: 0x${magic.toString(16)}; expected 0x${BATCH_MAGIC.toString(16)}`);
  }

  const seq      = view.getUint32(cursor, true); cursor += 4;
  const rowCount = view.getUint32(cursor, true); cursor += 4;
  const colCount = view.getUint32(cursor, true); cursor += 4;

  const descriptors: Array<{ type: ColumnDataType; byteLen: number }> = [];
  for (let i = 0; i < colCount; i++) {
    const typeTag = view.getUint32(cursor, true); cursor += 4;
    const byteLen = view.getUint32(cursor, true); cursor += 4;
    const type    = TAG_TO_TYPE[typeTag];
    if (type === undefined) throw new Error(`Unknown type tag: ${typeTag}`);
    descriptors.push({ type, byteLen });
  }

  const columns: ParsedColData[] = [];

  for (const { type, byteLen } of descriptors) {
    const slice = buffer.slice(cursor, cursor + byteLen);
    cursor += byteLen;

    if (type === "utf8") {
      const offsetByteLen = (rowCount + 1) * 4;
      const utf8Offsets   = new Uint32Array(slice.slice(0, offsetByteLen));
      const utf8Bytes     = new Uint8Array(slice.slice(offsetByteLen));
      columns.push({ type, data: null, utf8Offsets, utf8Bytes });
    } else if (type === "list_utf8") {
      let off = 0;
      const listTotalItems = new DataView(slice).getUint32(0, true); off += 4;
      const listRowOffsets  = new Uint32Array(slice.slice(off, off + (rowCount + 1) * 4)); off += (rowCount + 1) * 4;
      const listItemOffsets = new Uint32Array(slice.slice(off, off + (listTotalItems + 1) * 4)); off += (listTotalItems + 1) * 4;
      const listBytes       = new Uint8Array(slice.slice(off));
      columns.push({ type, data: null, listTotalItems, listRowOffsets, listItemOffsets, listBytes });
    } else {
      let data: NumericTypedArray;
      switch (type) {
        case "f64":
        case "timestamp_ms": data = new Float64Array(slice); break;
        case "i32":          data = new Int32Array(slice);   break;
        case "u32":          data = new Uint32Array(slice);  break;
        case "bool":         data = new Uint8Array(slice);   break;
      }
      columns.push({ type, data });
    }
  }

  return { seq, rowCount, columns };
}

// ─── Window Buffer Packer ──────────────────────────────────────────────────────
// Produces a single ArrayBuffer in the standard wire format.
// This is the Transferable payload sent in WINDOW_UPDATE.

function packWindowBuffer(
  columns: AnyColumn[],
  schema:  ResolvedColumn[],
  startRow: number,
  rowCount: number,
  seq: number,
): ArrayBuffer {
  type ColBuf = { type: ColumnDataType; bufs: ArrayBuffer[] };
  const colBufs: ColBuf[] = [];

  for (let i = 0; i < columns.length; i++) {
    const col  = columns[i]!;
    const type = schema[i]!.type;

    if (col instanceof ListUtf8Column) {
      const { totalItems, rowOffsets, itemOffsets, bytes } = col.copySlice(startRow, rowCount);
      colBufs.push({ type, bufs: [totalItems, rowOffsets, itemOffsets, bytes] });
    } else if (col instanceof Utf8Column) {
      const { offsets, bytes } = col.copySlice(startRow, rowCount);
      colBufs.push({ type, bufs: [offsets, bytes] });
    } else {
      colBufs.push({ type, bufs: [col.copySlice(startRow, rowCount)] });
    }
  }

  const headerSize     = 16;
  const descriptorSize = colBufs.length * 8;
  let   dataSize       = 0;
  for (const { bufs } of colBufs) for (const b of bufs) dataSize += b.byteLength;

  const out   = new ArrayBuffer(headerSize + descriptorSize + dataSize);
  const view  = new DataView(out);
  const bytes = new Uint8Array(out);
  let   cur   = 0;

  view.setUint32(cur, BATCH_MAGIC,    true); cur += 4;
  view.setUint32(cur, seq,            true); cur += 4;
  view.setUint32(cur, rowCount,       true); cur += 4;
  view.setUint32(cur, colBufs.length, true); cur += 4;

  for (const { type, bufs } of colBufs) {
    let byteLen = 0;
    for (const b of bufs) byteLen += b.byteLength;
    view.setUint32(cur, TYPE_TAG[type], true); cur += 4;
    view.setUint32(cur, byteLen,        true); cur += 4;
  }

  for (const { bufs } of colBufs) {
    for (const b of bufs) {
      bytes.set(new Uint8Array(b), cur);
      cur += b.byteLength;
    }
  }

  return out;
}

// ─── Zero-Measurement Layout Engine ───────────────────────────────────────────

function resolveLayout(
  schema:         ColumnSchema[],
  charWidthHint:  number,
  rowHeightHint:  number,
  totalRows:      number,
  viewportHeight: number,
): ViewportLayout {
  const columns: ResolvedColumn[] = schema.map((col, columnIndex) => ({
    ...col,
    computedWidth: asPixelSize(
      col.fixedWidth ?? (col.maxContentChars * charWidthHint + CELL_H_PADDING * 2),
    ),
    columnIndex,
  }));

  return {
    columns,
    rowHeight:    asPixelSize(rowHeightHint),
    totalRows,
    totalHeight:  asPixelSize(totalRows * rowHeightHint),
    viewportRows: Math.ceil(viewportHeight / rowHeightHint) + 1,
  };
}

// ─── Backpressure Controller ───────────────────────────────────────────────────

class BackpressureController {
  private readonly history = new RingBuffer(8);
  strategy: BackpressureStrategy = "NOMINAL";

  record(renderMs: number): BackpressureStrategy | null {
    this.history.push(renderMs);
    if (this.history.length < 4) return null;

    const avg = this.history.mean();
    const next: BackpressureStrategy =
      avg > 28 ? "SHED" :
      avg > 14 ? "BUFFER" :
                 "NOMINAL";

    if (next === this.strategy) return null;
    this.strategy = next;
    return next;
  }

  get avgMs(): number {
    return this.history.mean();
  }

  get queueSnapshot(): BackpressureState {
    return {
      strategy:    this.strategy,
      queueDepth:  0,
      avgRenderMs: asMs(this.avgMs),
    };
  }
}

// ─── DataWorkerCore ────────────────────────────────────────────────────────────

interface QueueItem {
  buffer: ArrayBuffer;
  seq:    number;
}

class DataWorkerCore {
  private schema:        ResolvedColumn[] = [];
  private columns:       AnyColumn[]      = [];
  private charWidthHint  = 8;
  private rowHeightHint  = 32;
  private viewportHeight = 600;
  private totalRows      = 0;
  private windowStart    = 0;
  private windowCount    = 0;
  private layout:        ViewportLayout | null = null;
  private seqCounter     = 0;

  private readonly bp    = new BackpressureController();
  private readonly queue: QueueItem[] = [];
  private processing = false;

  private static readonly MAX_QUEUE_DEPTH = 64;

  // ── Emit helper ──────────────────────────────────────────────────────────────

  private emit(event: WorkerEvent, transfer: Transferable[] = []): void {
    self.postMessage(event, transfer);
  }

  // ── Command handlers ──────────────────────────────────────────────────────────

  init(cmd: Extract<WorkerCommand, { type: "INIT" }>): void {
    this.charWidthHint  = cmd.charWidthHint;
    this.rowHeightHint  = cmd.rowHeightHint;
    this.viewportHeight = cmd.viewportHeight;

    this.columns = cmd.schema.map(col => {
      switch (col.type) {
        case "utf8":      return new Utf8Column();
        case "list_utf8": return new ListUtf8Column();
        default:          return new NumericColumn(col.type);
      }
    });

    this.layout      = resolveLayout(cmd.schema, this.charWidthHint, this.rowHeightHint, 0, this.viewportHeight);
    this.schema      = this.layout.columns;
    this.windowCount = this.layout.viewportRows;

    this.emit({ type: "LAYOUT_READY", layout: this.layout });
  }

  ingest(cmd: Extract<WorkerCommand, { type: "INGEST" }>): void {
    if (this.bp.strategy === "SHED" && this.queue.length >= DataWorkerCore.MAX_QUEUE_DEPTH) {
      this.queue.shift();
    }
    this.queue.push({ buffer: cmd.buffer, seq: cmd.seq });
    this.scheduleProcess();
  }

  setWindow(cmd: Extract<WorkerCommand, { type: "SET_WINDOW" }>): void {
    this.windowStart = cmd.startRow;
    this.windowCount = cmd.rowCount;
    this.flushWindow();
  }

  resizeViewport(cmd: Extract<WorkerCommand, { type: "RESIZE_VIEWPORT" }>): void {
    this.viewportHeight = cmd.height;
    if (this.schema.length > 0) this.rebuildLayout();
  }

  frameAck(cmd: Extract<WorkerCommand, { type: "FRAME_ACK" }>): void {
    const changed = this.bp.record(cmd.renderMs);
    if (changed !== null) {
      const state: BackpressureState = {
        strategy:    changed,
        queueDepth:  this.queue.length,
        avgRenderMs: asMs(this.bp.avgMs),
      };
      this.emit({ type: "BACKPRESSURE", state });
    }
  }

  // ── Internal processing ───────────────────────────────────────────────────────

  private scheduleProcess(): void {
    if (this.processing) return;
    this.processing = true;
    setTimeout(() => this.processQueue(), 0);
  }

  private processQueue(): void {
    this.processing = false;
    while (this.queue.length > 0) this.ingestBatch(this.queue.shift()!);
    this.flushWindow();
  }

  private ingestBatch(item: QueueItem): void {
    let batch: ParsedBatch;
    try {
      batch = parseBatch(item.buffer);
    } catch (e) {
      this.emit({ type: "INGEST_ERROR", seq: asBatchSeq(item.seq), message: String(e) });
      // Still ACK so the main-thread pump doesn't stall forever on a bad batch.
      this.emit({ type: "INGEST_ACK", seq: asBatchSeq(item.seq) });
      return;
    }

    // Pre-commit: verify each column's wire type matches its registered storage type.
    // Catches schema mismatches before any mutation — no partial-commit state possible.
    for (let i = 0; i < Math.min(batch.columns.length, this.columns.length); i++) {
      const batchType = batch.columns[i]!.type;
      const storeType = this.schema[i]!.type;
      if (batchType !== storeType) {
        const msg =
          `Schema type mismatch at column ${i} ("${this.schema[i]!.name}"): ` +
          `batch encodes "${batchType}" but store expects "${storeType}". ` +
          `Ensure the schema passed to INIT matches the encoder's schema exactly.`;
        this.emit({ type: "INGEST_ERROR", seq: asBatchSeq(item.seq), message: msg });
        this.emit({ type: "INGEST_ACK",   seq: asBatchSeq(item.seq) });
        return;
      }
    }

    for (let i = 0; i < batch.columns.length && i < this.columns.length; i++) {
      const col   = batch.columns[i]!;
      const store = this.columns[i]!;

      if (col.type === "list_utf8" && store instanceof ListUtf8Column) {
        store.append(
          col.listTotalItems!,
          col.listRowOffsets!,
          col.listItemOffsets!,
          col.listBytes!,
          batch.rowCount,
        );
      } else if (col.type === "utf8" && store instanceof Utf8Column) {
        store.append(col.utf8Offsets!, col.utf8Bytes!, batch.rowCount);
      } else if (store instanceof NumericColumn && col.data !== null) {
        store.append(col.data);
      }
    }

    this.totalRows += batch.rowCount;

    // Post-commit: verify all columns agree on row count.
    // Guards against index drift between parallel list_utf8 columns
    // (e.g. organism_ids and organism_names must have the same item count per row).
    // A violation here indicates the encoder produced mismatched arrays.
    for (let i = 0; i < this.columns.length; i++) {
      const colRows = this.columns[i]!.rowCount;
      if (colRows !== this.totalRows) {
        const msg =
          `Integrity violation after batch commit: column "${this.schema[i]!.name}" ` +
          `has ${colRows} rows but totalRows=${this.totalRows}. ` +
          `Parallel list_utf8 columns must encode identical row counts per batch ` +
          `(e.g. organism_ids and organism_names arrays must have the same length).`;
        this.emit({ type: "INGEST_ERROR", seq: asBatchSeq(item.seq), message: msg });
        this.emit({ type: "INGEST_ACK",   seq: asBatchSeq(item.seq) });
        return;
      }
    }

    this.rebuildLayout();
    this.emit({ type: "TOTAL_ROWS_UPDATED", totalRows: this.totalRows });

    // Signal the main-thread pump that this batch is committed.
    // Use item.seq (the INGEST command's sequence number) — this is what
    // the pump registered in ackResolversRef, not the wire-format seq.
    this.emit({ type: "INGEST_ACK", seq: asBatchSeq(item.seq) });
  }

  private rebuildLayout(): void {
    this.layout = resolveLayout(
      this.schema,
      this.charWidthHint,
      this.rowHeightHint,
      this.totalRows,
      this.viewportHeight,
    );
    this.schema = this.layout.columns;
  }

  private flushWindow(): void {
    if (!this.layout || this.totalRows === 0 || this.windowCount === 0) return;

    const start  = Math.max(0, Math.min(this.windowStart, this.totalRows - 1));
    const count  = Math.min(this.windowCount, this.totalRows - start);
    if (count <= 0) return;

    const seq    = this.seqCounter++;
    const buffer = packWindowBuffer(this.columns, this.schema, start, count, seq);

    const win: DataWindow = {
      seq:      asBatchSeq(seq),
      startRow: asRowIndex(start),
      rowCount: count,
      layout:   this.layout,
      buffer,
    };

    this.emit({ type: "WINDOW_UPDATE", window: win }, [buffer]);
  }
}

// ─── Module Entry Point ────────────────────────────────────────────────────────

const core = new DataWorkerCore();

self.onmessage = (e: MessageEvent<WorkerCommand>) => {
  const cmd = e.data;
  switch (cmd.type) {
    case "INIT":            core.init(cmd);           break;
    case "INGEST":          core.ingest(cmd);         break;
    case "SET_WINDOW":      core.setWindow(cmd);      break;
    case "RESIZE_VIEWPORT": core.resizeViewport(cmd); break;
    case "FRAME_ACK":       core.frameAck(cmd);       break;
    case "TERMINATE":       self.close();             break;
  }
};
