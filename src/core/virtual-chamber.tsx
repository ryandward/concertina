/**
 * VirtualChamber — The Hardened Chamber
 *
 * Maintains a constant DOM node count (pool = viewportRows + overscan×2)
 * regardless of total dataset size. Pool nodes are absolutely positioned
 * and recycled via CSS transform — React never creates or destroys row nodes
 * while scrolling. Only the transform and row content are updated.
 *
 * Data is read from the transferred ArrayBuffer in the AtomicStore without
 * any additional copying. Column accessors are created once per window update.
 *
 * list_utf8 columns are decoded entirely here: RowProxy.get() returns a
 * pre-parsed string[] — no JSON.parse on the main thread.
 */

import {
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useAtomicSlice } from "./atomic-store";
import type { AtomicStore } from "./atomic-store";
import {
  BATCH_MAGIC,
  TAG_TO_TYPE,
  asRowIndex,
  asPoolSlot,
  type ResolvedColumn,
  type DataWindow,
  type ViewportLayout,
  type RowIndex,
  type PoolSlot,
  type ColumnDataType,
} from "./types";

// ─── Column Accessors (zero-copy reads from transferred buffer) ───────────────

interface NumericAccessor {
  readonly kind: "numeric";
  readonly type: ColumnDataType;
  readonly data: Float64Array | Int32Array | Uint32Array | Uint8Array;
}

interface Utf8Accessor {
  readonly kind: "utf8";
  readonly offsets: Uint32Array;
  readonly bytes: Uint8Array;
  readonly decoder: TextDecoder;
}

/**
 * ListUtf8Accessor — parsed from the list_utf8 wire block.
 *
 * rowOffsets[i..i+1)  → item index range for row i (within this window)
 * itemOffsets[j..j+1) → byte range in `bytes` for item j
 * bytes               → UTF-8 string data for all items in the window
 *
 * RowProxy.get() for a list_utf8 column returns string[] directly —
 * no JSON.parse on the main thread.
 */
interface ListUtf8Accessor {
  readonly kind: "list_utf8";
  readonly rowOffsets: Uint32Array;
  readonly itemOffsets: Uint32Array;
  readonly bytes: Uint8Array;
  readonly decoder: TextDecoder;
}

type ColumnAccessor = NumericAccessor | Utf8Accessor | ListUtf8Accessor;

/** Parse the transferred window buffer once into typed column accessors. */
function buildAccessors(
  buffer: ArrayBuffer,
  rowCount: number,
): ColumnAccessor[] | null {
  if (buffer.byteLength < 16) return null;

  const view = new DataView(buffer);

  const magic = view.getUint32(0, true);
  if (magic !== BATCH_MAGIC) return null;

  // [4] seq (skip), [8] rowCount (trust DataWindow.rowCount), [12] colCount
  const colCount = view.getUint32(12, true);

  const descriptors: Array<{ type: ColumnDataType; byteLen: number }> = [];
  let cursor = 16;

  for (let i = 0; i < colCount; i++) {
    const typeTag = view.getUint32(cursor, true); cursor += 4;
    const byteLen = view.getUint32(cursor, true); cursor += 4;
    const type    = TAG_TO_TYPE[typeTag];
    if (!type) return null;
    descriptors.push({ type, byteLen });
  }

  const accessors: ColumnAccessor[] = [];

  for (const { type, byteLen } of descriptors) {
    const slice = buffer.slice(cursor, cursor + byteLen);
    cursor += byteLen;

    if (type === "utf8") {
      const offsetByteLen = (rowCount + 1) * 4;
      accessors.push({
        kind:    "utf8",
        offsets: new Uint32Array(slice.slice(0, offsetByteLen)),
        bytes:   new Uint8Array(slice.slice(offsetByteLen)),
        decoder: new TextDecoder(),
      });
    } else if (type === "list_utf8") {
      // [4] totalItems, [(rowCount+1)*4] rowOffsets, [(totalItems+1)*4] itemOffsets, [*] bytes
      let off = 0;
      const totalItems = new DataView(slice).getUint32(0, true); off += 4;
      const rowOffsets  = new Uint32Array(slice.slice(off, off + (rowCount + 1) * 4)); off += (rowCount + 1) * 4;
      const itemOffsets = new Uint32Array(slice.slice(off, off + (totalItems + 1) * 4)); off += (totalItems + 1) * 4;
      const bytes       = new Uint8Array(slice.slice(off));
      accessors.push({ kind: "list_utf8", rowOffsets, itemOffsets, bytes, decoder: new TextDecoder() });
    } else {
      let data: Float64Array | Int32Array | Uint32Array | Uint8Array;
      switch (type) {
        case "f64":
        case "timestamp_ms": data = new Float64Array(slice); break;
        case "i32":          data = new Int32Array(slice);   break;
        case "u32":          data = new Uint32Array(slice);  break;
        case "bool":         data = new Uint8Array(slice);   break;
      }
      accessors.push({ kind: "numeric", type, data });
    }
  }

  return accessors;
}

// ─── RowProxy ─────────────────────────────────────────────────────────────────

export interface RowProxy {
  /**
   * Schema-aware accessor.
   * - utf8 columns     → string
   * - list_utf8 columns → string[]  (pre-parsed, no JSON.parse on main thread)
   * - numeric columns  → number | boolean
   * - unknown column   → null
   */
  get(column: string): string | number | boolean | string[] | null;
}

function buildRowProxy(
  accessors: ColumnAccessor[],
  schema:    ResolvedColumn[],
  localRow:  number,
): RowProxy {
  return {
    get(column: string): string | number | boolean | string[] | null {
      const idx = schema.findIndex(c => c.name === column);
      if (idx === -1 || idx >= accessors.length) return null;

      const acc = accessors[idx]!;

      if (acc.kind === "utf8") {
        const start = acc.offsets[localRow]!;
        const end   = acc.offsets[localRow + 1]!;
        return acc.decoder.decode(acc.bytes.subarray(start, end));
      }

      if (acc.kind === "list_utf8") {
        const startItem = acc.rowOffsets[localRow]!;
        const endItem   = acc.rowOffsets[localRow + 1]!;
        const result: string[] = [];
        for (let j = startItem; j < endItem; j++) {
          const byteStart = acc.itemOffsets[j]!;
          const byteEnd   = acc.itemOffsets[j + 1]!;
          result.push(acc.decoder.decode(acc.bytes.subarray(byteStart, byteEnd)));
        }
        return result;
      }

      // Numeric
      const val = (acc.data as Float64Array)[localRow];
      if (val === undefined) return null;
      if (acc.type === "bool") return val !== 0;
      return val;
    },
  };
}

// ─── Pool Slot Assignment ──────────────────────────────────────────────────────

interface PoolAssignment {
  readonly poolSlot:   PoolSlot;
  readonly rowIndex:   RowIndex;
  readonly localIndex: number;
  readonly y:          number;
}

function buildPoolAssignments(
  win:      DataWindow,
  rowHeight: number,
  poolSize: number,
): PoolAssignment[] {
  const assignments: PoolAssignment[] = [];

  for (let i = 0; i < win.rowCount; i++) {
    const rowIndex = win.startRow + i;
    assignments.push({
      poolSlot:   asPoolSlot(i % poolSize),
      rowIndex:   asRowIndex(rowIndex),
      localIndex: i,
      y:          rowIndex * rowHeight,
    });
  }

  return assignments;
}

// ─── VirtualChamber ───────────────────────────────────────────────────────────

const OVERSCAN_ROWS = 3;

export interface VirtualChamberProps {
  store: AtomicStore;
  /**
   * Render function called once per visible row.
   * Receives a RowProxy for schema-safe column access and the absolute row index.
   */
  renderRow: (row: RowProxy, rowIndex: RowIndex) => ReactNode;
  /**
   * Callback ref for the scroll container element.
   * Pass the `containerRef` returned by useStabilityOrchestrator directly.
   * Using a plain callback avoids React namespace conflicts across package boundaries.
   */
  containerRef?: (el: HTMLElement | null) => void;
  className?: string;
  style?: CSSProperties;
}

export function VirtualChamber(
  { store, renderRow, containerRef, className, style }: VirtualChamberProps,
) {
  const layout = useAtomicSlice(store, s => s.layout);
  const win    = useAtomicSlice(store, s => s.window);
  const pitch  = useAtomicSlice(store, s => s.pitch);

  // Build column accessors once per window update, not per row render.
  const accessors = useMemo(
    () => (win ? buildAccessors(win.buffer, win.rowCount) : null),
    [win],
  );

  const poolSize = layout ? layout.viewportRows + OVERSCAN_ROWS * 2 : 0;

  // DOM-traced pitch overrides Worker's rowHeight when available.
  // pitch = 0 means "not yet measured" → fall back to layout.rowHeight.
  const rh = (pitch && pitch > 0 ? pitch : layout?.rowHeight) ?? 0;

  const assignments = useMemo(
    () => (win && rh > 0 ? buildPoolAssignments(win, rh, poolSize) : []),
    [win, rh, poolSize],
  );

  if (!layout) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        overflow: "auto",
        contain: "strict",
        ...style,
      }}
    >
      {/*
        Spacer: gives the scrollbar an accurate range without rendering data.
        height = totalRows × rh (pitch-aware).
      */}
      <div
        aria-hidden
        style={{ height: layout.totalRows * rh, pointerEvents: "none" }}
      />

      {/*
        Pool nodes: position:absolute, constant count, recycled by CSS transform.
        key = poolSlot (0..poolSize-1) — stable across scroll, no DOM churn.
      */}
      {accessors !== null &&
        assignments.map(({ poolSlot, rowIndex, localIndex, y }) => (
          <div
            key={poolSlot}
            role="row"
            aria-rowindex={rowIndex + 1}
            style={{
              position:   "absolute",
              top:        0,
              left:       0,
              right:      0,
              height:     rh,
              transform:  `translateY(${y}px)`,
              willChange: "transform",
              contain:    "layout style",
            }}
          >
            {renderRow(
              buildRowProxy(accessors, layout.columns, localIndex),
              rowIndex,
            )}
          </div>
        ))}
    </div>
  );
}

