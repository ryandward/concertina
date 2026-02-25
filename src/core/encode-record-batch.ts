/**
 * encodeRecordBatch — produce an INGEST-compatible wire buffer.
 *
 * Converts row-oriented JavaScript data into the columnar binary format
 * expected by DataWorker's INGEST command. Use this when your data source
 * yields plain objects; if your source already speaks Arrow IPC or a columnar
 * binary format, write a thin adapter that produces the same layout.
 */

import {
  BATCH_MAGIC,
  TYPE_TAG,
  type ColumnSchema,
  type BatchSeq,
  type ColumnDataType,
  asBatchSeq,
} from "./types";

export type RowRecord = Record<string, unknown>;

/**
 * Encode a batch of rows into the DataWorker wire format.
 *
 * @param schema  Column definitions — types must match the runtime values.
 * @param rows    Row-oriented data. Order must match schema order.
 * @param seq     Monotonic sequence number (use asBatchSeq(i) for each call).
 * @returns       ArrayBuffer ready to transfer as an INGEST payload.
 */
export function encodeRecordBatch(
  schema: ColumnSchema[],
  rows:   RowRecord[],
  seq:    BatchSeq = asBatchSeq(0),
): ArrayBuffer {
  const rowCount = rows.length;
  const colCount = schema.length;
  const encoder  = new TextEncoder();

  // ── First pass: collect typed column buffers ──────────────────────────────

  type ColBuf = { type: ColumnDataType; bufs: ArrayBuffer[] };
  const colBufs: ColBuf[] = [];

  for (const col of schema) {
    const vals = rows.map(r => r[col.name]);

    switch (col.type) {
      case "f64":
      case "timestamp_ms": {
        const data = new Float64Array(rowCount);
        for (let i = 0; i < rowCount; i++) data[i] = Number(vals[i] ?? 0);
        colBufs.push({ type: col.type, bufs: [data.buffer as ArrayBuffer] });
        break;
      }
      case "i32": {
        const data = new Int32Array(rowCount);
        for (let i = 0; i < rowCount; i++) data[i] = Math.trunc(Number(vals[i] ?? 0));
        colBufs.push({ type: "i32", bufs: [data.buffer as ArrayBuffer] });
        break;
      }
      case "u32": {
        const data = new Uint32Array(rowCount);
        for (let i = 0; i < rowCount; i++) data[i] = Math.trunc(Number(vals[i] ?? 0)) >>> 0;
        colBufs.push({ type: "u32", bufs: [data.buffer as ArrayBuffer] });
        break;
      }
      case "bool": {
        const data = new Uint8Array(rowCount);
        for (let i = 0; i < rowCount; i++) data[i] = vals[i] ? 1 : 0;
        colBufs.push({ type: "bool", bufs: [data.buffer as ArrayBuffer] });
        break;
      }
      case "utf8": {
        // Encode all strings, build offset table
        const encoded: Uint8Array[] = [];
        let   totalBytes = 0;

        for (const val of vals) {
          const str  = val == null ? "" : String(val);
          const enc  = encoder.encode(str);
          encoded.push(enc);
          totalBytes += enc.byteLength;
        }

        const offsets = new Uint32Array(rowCount + 1);
        const bytes   = new Uint8Array(totalBytes);
        let   cursor  = 0;

        offsets[0] = 0;
        for (let i = 0; i < rowCount; i++) {
          const enc  = encoded[i]!;
          bytes.set(enc, cursor);
          cursor       += enc.byteLength;
          offsets[i + 1] = cursor;
        }

        colBufs.push({
          type: "utf8",
          bufs: [offsets.buffer as ArrayBuffer, bytes.buffer as ArrayBuffer],
        });
        break;
      }
      case "list_utf8": {
        // Each row value is string[]. Nested list encoding.
        // Wire layout: [4 totalItems][rowOffsets][(totalItems+1) itemOffsets][bytes]
        const rowArrays: string[][] = vals.map(v =>
          Array.isArray(v) ? (v as unknown[]).map(String) : [],
        );

        // Encode every item string up front to know totals
        const encodedItems: Uint8Array[][] = rowArrays.map(arr =>
          arr.map(s => encoder.encode(s)),
        );

        let totalItems = 0;
        let totalBytes = 0;
        for (const items of encodedItems) {
          totalItems += items.length;
          for (const enc of items) totalBytes += enc.byteLength;
        }

        const header      = new Uint32Array([totalItems]);
        const rowOffsets  = new Uint32Array(rowCount + 1);
        const itemOffsets = new Uint32Array(totalItems + 1);
        const bytes       = new Uint8Array(totalBytes);

        let itemIdx = 0;
        let byteIdx = 0;
        rowOffsets[0]  = 0;
        itemOffsets[0] = 0;

        for (let r = 0; r < rowCount; r++) {
          const items = encodedItems[r]!;
          for (const enc of items) {
            bytes.set(enc, byteIdx);
            byteIdx += enc.byteLength;
            itemOffsets[itemIdx + 1] = byteIdx;
            itemIdx++;
          }
          rowOffsets[r + 1] = itemIdx;
        }

        colBufs.push({
          type: "list_utf8",
          bufs: [
            header.buffer      as ArrayBuffer,
            rowOffsets.buffer  as ArrayBuffer,
            itemOffsets.buffer as ArrayBuffer,
            bytes.buffer       as ArrayBuffer,
          ],
        });
        break;
      }
    }
  }

  // ── Second pass: pack into a single buffer ────────────────────────────────

  const headerSize     = 16;
  const descriptorSize = colCount * 8;
  let   dataSize       = 0;
  for (const { bufs } of colBufs) for (const b of bufs) dataSize += b.byteLength;

  const out      = new ArrayBuffer(headerSize + descriptorSize + dataSize);
  const view     = new DataView(out);
  const outBytes = new Uint8Array(out);
  let   cur      = 0;

  view.setUint32(cur, BATCH_MAGIC, true); cur += 4;
  view.setUint32(cur, seq,         true); cur += 4;
  view.setUint32(cur, rowCount,    true); cur += 4;
  view.setUint32(cur, colCount,    true); cur += 4;

  for (const { type, bufs } of colBufs) {
    let byteLen = 0;
    for (const b of bufs) byteLen += b.byteLength;
    view.setUint32(cur, TYPE_TAG[type], true); cur += 4;
    view.setUint32(cur, byteLen,        true); cur += 4;
  }

  for (const { bufs } of colBufs) {
    for (const b of bufs) {
      outBytes.set(new Uint8Array(b), cur);
      cur += b.byteLength;
    }
  }

  return out;
}

/**
 * Convenience: encode a stream of row-batches into a ReadableStream<ArrayBuffer>.
 * Feed the result directly to useStabilityOrchestrator's ingest().
 *
 * @param schema   Column definitions.
 * @param batches  AsyncIterable of row arrays.
 */
export function createRecordBatchStream(
  schema:  ColumnSchema[],
  batches: AsyncIterable<RowRecord[]>,
): ReadableStream<ArrayBuffer> {
  let seq = 0;

  return new ReadableStream<ArrayBuffer>({
    async start(controller) {
      try {
        for await (const rows of batches) {
          controller.enqueue(encodeRecordBatch(schema, rows, asBatchSeq(seq++)));
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}
