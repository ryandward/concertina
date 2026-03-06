/**
 * useArrayIngest — pipe a plain JSON array into the Core Stability Engine.
 *
 * Bridges the gap between data-fetching libraries (React Query, SWR, Apollo)
 * and the Core Engine's binary streaming pipeline. Accepts a `T[]` and
 * handles chunking, encoding, and lifecycle automatically.
 *
 * ```ts
 * const { data } = useQuery({ queryKey: ["rows"], queryFn: fetchRows });
 * const orchestrator = useStabilityOrchestrator({ schema });
 *
 * useArrayIngest(orchestrator, schema, data);
 * ```
 *
 * ## How it works
 *
 * Creates a pull-based ReadableStream from the data array. Each `pull()`
 * encodes one chunk (default 1000 rows) into the binary wire format via
 * `encodeRecordBatch`. The orchestrator's `ingest()` pump reads chunks
 * one at a time, sending each to the worker and awaiting INGEST_ACK before
 * pulling the next.
 *
 * This gives natural jank-free pacing without `setTimeout` hacks: the
 * INGEST_ACK round-trip is inherently async (postMessage → worker commit →
 * onmessage), so the main thread yields between every chunk. Each `pull()`
 * encodes ~1000 rows (~0.5–2ms), well within the 16ms frame budget.
 *
 * When `data` changes (new reference), the effect cleanup aborts the
 * previous stream and starts a fresh pipeline. When `data` is null or
 * undefined, no ingestion runs — compatible with loading states.
 */

import { useEffect, useRef } from "react";
import { encodeRecordBatch, type RowRecord } from "./encode-record-batch";
import { asBatchSeq, type ColumnSchema } from "./types";
import type { StabilityOrchestratorReturn } from "./use-stability-orchestrator";

export interface UseArrayIngestOptions {
  /** Rows per encoded batch. Default: 1000. */
  chunkSize?: number;
}

export function useArrayIngest(
  orchestrator: Pick<StabilityOrchestratorReturn, "ingest">,
  schema: readonly ColumnSchema[],
  data: RowRecord[] | null | undefined,
  options?: UseArrayIngestOptions,
): void {
  const chunkSize = options?.chunkSize ?? 1000;

  // Stable refs — avoid re-triggering the effect when the orchestrator
  // or schema object identity changes between renders.
  const ingestRef = useRef(orchestrator.ingest);
  ingestRef.current = orchestrator.ingest;

  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  useEffect(() => {
    if (!data || data.length === 0) return;

    const rows = data;
    const cols = schemaRef.current;
    let cursor = 0;
    let seq = 0;

    // Pull-based stream: encodes one chunk per pull() call.
    //
    // Why pull-based instead of an async generator piped through start()?
    //
    // start() eagerly iterates the generator and buffers ALL encoded chunks
    // in the stream's internal queue — 50k rows × 10 columns would allocate
    // ~50 encoded ArrayBuffers before the pump reads the first one.
    //
    // pull() encodes on demand: the ingest pump calls reader.read(), which
    // triggers pull(), which encodes exactly one chunk and enqueues it.
    // The pump then sends the chunk to the worker and awaits INGEST_ACK.
    // The next pull() doesn't fire until the pump calls read() again.
    //
    // Result: O(chunkSize) memory per encoded batch, natural async yielding
    // via the INGEST_ACK round-trip, zero setTimeout overhead.
    const stream = new ReadableStream<ArrayBuffer>({
      pull(controller) {
        if (cursor >= rows.length) {
          controller.close();
          return;
        }
        const chunk = rows.slice(cursor, cursor + chunkSize);
        cursor += chunkSize;
        controller.enqueue(
          encodeRecordBatch(cols as ColumnSchema[], chunk, asBatchSeq(seq++)),
        );
      },
    });

    const cancel = ingestRef.current(stream);
    return cancel;
  }, [data, chunkSize]);
}
