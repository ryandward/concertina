// ─── Branded Scalar Types ─────────────────────────────────────────────────────
// Prevents mixing row indices with pixel sizes, sequence numbers, etc.
// The unique symbol trick produces zero-runtime-overhead phantom types.

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type RowIndex     = Brand<number, "RowIndex">;
export type PixelSize    = Brand<number, "PixelSize">;
export type Milliseconds = Brand<number, "Milliseconds">;
export type BatchSeq     = Brand<number, "BatchSeq">;
export type PoolSlot     = Brand<number, "PoolSlot">;

export const asRowIndex  = (n: number): RowIndex     => n as RowIndex;
export const asPixelSize = (n: number): PixelSize    => n as PixelSize;
export const asMs        = (n: number): Milliseconds => n as Milliseconds;
export const asBatchSeq  = (n: number): BatchSeq     => n as BatchSeq;
export const asPoolSlot  = (n: number): PoolSlot     => n as PoolSlot;

// ─── Schema ───────────────────────────────────────────────────────────────────

export type ColumnDataType =
  | "f64"
  | "i32"
  | "u32"
  | "bool"
  | "timestamp_ms"
  | "utf8"
  | "list_utf8";

export interface ColumnSchema {
  readonly name: string;
  readonly type: ColumnDataType;
  /**
   * Zero-Measurement layout hint: worst-case character count for this column.
   * Worker derives pixel width as `maxContentChars * charWidthHint + CELL_H_PADDING`.
   * Overridden when `fixedWidth` is provided.
   */
  readonly maxContentChars: number;
  readonly fixedWidth?: PixelSize;
}

/** Schema after the worker has resolved pixel geometry. */
export interface ResolvedColumn extends ColumnSchema {
  readonly computedWidth: PixelSize;
  readonly columnIndex: number;
}

// ─── Wire Format ─────────────────────────────────────────────────────────────
// Binary batch layout (all values little-endian):
//
//   Header (16 bytes):
//     [0]  u32  magic     = BATCH_MAGIC
//     [4]  u32  seq       monotonic batch sequence number
//     [8]  u32  rowCount
//    [12]  u32  colCount
//
//   Column Descriptors (colCount × 8 bytes):
//     [+0] u32  typeTag   (see TYPE_TAG)
//     [+4] u32  byteLen   byte length of this column's data block
//
//   Column Data Blocks (variable):
//     f64         → rowCount × 8 bytes  (Float64Array)
//     i32         → rowCount × 4 bytes  (Int32Array)
//     u32         → rowCount × 4 bytes  (Uint32Array)
//     bool        → rowCount × 1 byte   (Uint8Array, 0/1)
//     timestamp_ms→ rowCount × 8 bytes  (Float64Array, epoch ms)
//     utf8        → offsets: (rowCount+1) × 4 bytes (Uint32Array)
//                   then bytes: Σ(string lengths) bytes (Uint8Array)
//                   byteLen covers BOTH offsets and bytes
//     list_utf8   → [4]                  u32     totalItems
//                   [(rowCount+1)×4]     Uint32  rowOffsets
//                     row i → items[rowOffsets[i] .. rowOffsets[i+1])
//                   [(totalItems+1)×4]   Uint32  itemOffsets
//                     item j → bytes[itemOffsets[j] .. itemOffsets[j+1])
//                   [Σ item byte lengths] Uint8  bytes (UTF-8 string data)

export const BATCH_MAGIC    = 0xac1dc0de as const;
export const CELL_H_PADDING = 16 as PixelSize; // horizontal padding per cell, both sides

export const TYPE_TAG: Readonly<Record<ColumnDataType, number>> = {
  f64: 0, i32: 1, u32: 2, bool: 3, timestamp_ms: 4, utf8: 5, list_utf8: 6,
} as const;

export const TAG_TO_TYPE: Readonly<Record<number, ColumnDataType>> = {
  0: "f64", 1: "i32", 2: "u32", 3: "bool", 4: "timestamp_ms", 5: "utf8", 6: "list_utf8",
} as const;

// ─── Worker Commands  (Main → Worker) ────────────────────────────────────────

export type WorkerCommand =
  | {
      readonly type: "INIT";
      readonly schema: ColumnSchema[];
      /** Approximate monospace char width in px — drives column widths. */
      readonly charWidthHint: PixelSize;
      /** Approximate row height in px — drives rowHeight and viewportRows. */
      readonly rowHeightHint: PixelSize;
      /** Initial scroll-container height in px. */
      readonly viewportHeight: PixelSize;
    }
  | {
      readonly type: "INGEST";
      /**
       * Packed columnar batch in the binary format above.
       * Transferred to the worker — main thread loses ownership.
       */
      readonly buffer: ArrayBuffer;
      readonly seq: BatchSeq;
    }
  | {
      readonly type: "SET_WINDOW";
      readonly startRow: RowIndex;
      /** How many rows to include (typically viewportRows + 2 × overscan). */
      readonly rowCount: number;
    }
  | {
      readonly type: "RESIZE_VIEWPORT";
      readonly height: PixelSize;
    }
  | {
      /**
       * Main thread reports render time after each rAF.
       * Worker uses this to tune the backpressure strategy.
       */
      readonly type: "FRAME_ACK";
      readonly renderMs: Milliseconds;
      readonly seq: BatchSeq;
    }
  | { readonly type: "TERMINATE" };

// ─── Viewport Layout (computed by Worker, Zero-Measurement) ──────────────────

export interface ViewportLayout {
  readonly columns: ResolvedColumn[];
  readonly rowHeight: PixelSize;
  readonly totalRows: number;
  readonly totalHeight: PixelSize;
  /** Number of rows visible in the current viewport, including partial. */
  readonly viewportRows: number;
}

// ─── Data Window (transferred from Worker to Main) ────────────────────────────

export interface DataWindow {
  readonly seq: BatchSeq;
  readonly startRow: RowIndex;
  readonly rowCount: number;
  readonly layout: ViewportLayout;
  /**
   * Packed window buffer in the same binary format as INGEST.
   * Transferred to main thread — single zero-copy transfer.
   * Parse with buildAccessors() in virtual-chamber.tsx.
   */
  readonly buffer: ArrayBuffer;
}

// ─── Backpressure ─────────────────────────────────────────────────────────────

/**
 * NOMINAL  — all frames within 16ms budget; full ingestion.
 * BUFFER   — frames 14–28ms; coalesce ingest queue before emitting updates.
 * SHED     — frames > 28ms; drop oldest queued batches to stay alive.
 */
export type BackpressureStrategy = "NOMINAL" | "BUFFER" | "SHED";

export interface BackpressureState {
  readonly strategy: BackpressureStrategy;
  readonly queueDepth: number;
  readonly avgRenderMs: Milliseconds;
}

// ─── Worker Events  (Worker → Main) ──────────────────────────────────────────

export type WorkerEvent =
  | {
      readonly type: "LAYOUT_READY";
      readonly layout: ViewportLayout;
    }
  | {
      readonly type: "WINDOW_UPDATE";
      /** buffer inside DataWindow is Transferable — received as detached on worker side. */
      readonly window: DataWindow;
    }
  | {
      readonly type: "BACKPRESSURE";
      readonly state: BackpressureState;
    }
  | {
      readonly type: "TOTAL_ROWS_UPDATED";
      readonly totalRows: number;
    }
  | {
      readonly type: "INGEST_ERROR";
      readonly seq: BatchSeq;
      readonly message: string;
    }
  | {
      /**
       * Emitted by the worker after each INGEST batch is committed to column
       * storage. The main-thread ingest pump awaits this before sending the
       * next batch, providing true IPC-level backpressure: at most one batch
       * in flight at a time regardless of dataset size.
       */
      readonly type: "INGEST_ACK";
      readonly seq: BatchSeq;
    };

// ─── Atomic Store State ───────────────────────────────────────────────────────

export type StreamStatus = "idle" | "streaming" | "complete" | "error";

export interface StoreState {
  readonly status: StreamStatus;
  readonly layout: ViewportLayout | null;
  readonly window: DataWindow | null;
  readonly backpressure: BackpressureState;
  readonly totalRows: number;
  readonly error: string | null;
  /** DOM-traced row pitch in px. 0 = use layout.rowHeight from Worker. */
  readonly pitch: number;
}

export const INITIAL_STORE_STATE: StoreState = {
  status: "idle",
  layout: null,
  window: null,
  backpressure: { strategy: "NOMINAL", queueDepth: 0, avgRenderMs: asMs(0) },
  totalRows: 0,
  error: null,
  pitch: 0,
};
