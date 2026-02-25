// Core Stability Engine — public surface (v1.0.0)

// ── Orchestration ─────────────────────────────────────────────────────────────
export { useStabilityOrchestrator } from "./use-stability-orchestrator";
export type {
  StabilityOrchestratorOptions,
  StabilityOrchestratorReturn,
} from "./use-stability-orchestrator";

// ── Atomic Store ──────────────────────────────────────────────────────────────
export { AtomicStore, useAtomicSlice } from "./atomic-store";

// ── Virtual Rendering ─────────────────────────────────────────────────────────
export { VirtualChamber } from "./virtual-chamber";
export type { VirtualChamberProps, RowProxy } from "./virtual-chamber";

// ── Wire format utilities ─────────────────────────────────────────────────────
export { encodeRecordBatch, createRecordBatchStream } from "./encode-record-batch";
export type { RowRecord } from "./encode-record-batch";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  // Schema
  ColumnSchema,
  ColumnDataType,
  ResolvedColumn,
  // Layout
  ViewportLayout,
  DataWindow,
  // Backpressure
  BackpressureStrategy,
  BackpressureState,
  // Store
  StoreState,
  StreamStatus,
  // Branded scalars
  RowIndex,
  PixelSize,
  Milliseconds,
  BatchSeq,
  PoolSlot,
  // Worker protocol
  WorkerCommand,
  WorkerEvent,
} from "./types";

// ── Scalar constructors ───────────────────────────────────────────────────────
export {
  asRowIndex,
  asPixelSize,
  asMs,
  asBatchSeq,
  asPoolSlot,
  BATCH_MAGIC,
  CELL_H_PADDING,
} from "./types";
