/**
 * useStabilityOrchestrator — golden-path hook for the Core Stability Engine.
 *
 * Responsibilities:
 *   1. Spawn + own the DataWorker lifecycle.
 *   2. Pump a ReadableStream<ArrayBuffer> → worker with INGEST_ACK backpressure:
 *      at most one batch is in-flight at a time regardless of dataset size.
 *   3. Translate scroll position into SET_WINDOW commands (worker-derived rowHeight).
 *   4. Report actual frame render time to the worker via rAF + FRAME_ACK.
 *   5. Relay viewport size changes to the worker for Zero-Measurement layout updates.
 *   6. Expose the AtomicStore for downstream components to subscribe to.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AtomicStore } from "./atomic-store";
import {
  asMs,
  asPixelSize,
  asRowIndex,
  asBatchSeq,
  type ColumnSchema,
  type WorkerCommand,
  type WorkerEvent,
  type ViewportLayout,
  type BatchSeq,
} from "./types";

// ─── Public API ───────────────────────────────────────────────────────────────

export interface StabilityOrchestratorOptions {
  /** Schema for the incoming data stream. */
  schema: ColumnSchema[];
  /**
   * Approximate character width in px.
   * Used by the worker's Zero-Measurement layout engine to derive column widths.
   * Match your table's font: 8px suits 14px monospace, 7px suits 14px proportional.
   */
  charWidthHint?: number;
  /**
   * Approximate row height in px. Default: 36.
   */
  rowHeightHint?: number;
  /**
   * Extra rows to render above and below the visible window. Default: 3.
   */
  overscanRows?: number;
  /**
   * Initial viewport height hint in px.
   * Overridden automatically when containerRef is attached to the scroll element.
   */
  initialViewportHeight?: number;
}

export interface StabilityOrchestratorReturn {
  /** Attach to the scroll container element (the VirtualChamber outer div). */
  containerRef: (el: HTMLElement | null) => void;
  /** The single atomic store. Pass to VirtualChamber and any other subscribers. */
  store: AtomicStore;
  /**
   * Begin consuming a ReadableStream<ArrayBuffer>.
   * Each chunk must be a record batch in the standard wire format.
   * Returns a cleanup function that cancels the stream.
   *
   * Backpressure: the pump sends one batch at a time and awaits INGEST_ACK
   * from the worker before reading the next chunk. IPC queue depth is O(1).
   */
  ingest: (stream: ReadableStream<ArrayBuffer>) => () => void;
  /** Programmatically scroll to an absolute row index. */
  scrollToRow: (row: number) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStabilityOrchestrator(
  options: StabilityOrchestratorOptions,
): StabilityOrchestratorReturn {
  const {
    schema,
    charWidthHint         = 8,
    rowHeightHint         = 36,
    overscanRows          = 3,
    initialViewportHeight = typeof window !== "undefined" ? window.innerHeight : 600,
  } = options;

  // ── Stable instances (created once per hook mount) ───────────────────────────

  const [store] = useState(() => new AtomicStore());

  const workerRef             = useRef<Worker | null>(null);
  const containerRef_internal = useRef<HTMLElement | null>(null);
  const layoutRef             = useRef<ViewportLayout | null>(null);
  const seqRef                = useRef<BatchSeq>(asBatchSeq(0));
  const roRef                 = useRef<ResizeObserver | null>(null);
  const schemaRef             = useRef(schema);
  schemaRef.current           = schema;

  /**
   * Pending INGEST_ACK resolvers keyed by batch sequence number.
   * Stores both resolve and reject so the pump can be unblocked either cleanly
   * (TERMINATE / stream done) or with an error (worker crash via onerror).
   */
  const ackResolversRef = useRef<Map<number, { resolve: () => void; reject: (err: Error) => void }>>(new Map());

  // ── Worker lifecycle ─────────────────────────────────────────────────────────

  useEffect(() => {
    const worker = new Worker(
      new URL("./data-worker.js", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerEvent>) => {
      const event = e.data;

      // INGEST_ACK is internal plumbing — resolve the pending promise and
      // do not forward to the store.
      if (event.type === "INGEST_ACK") {
        const resolver = ackResolversRef.current.get(event.seq);
        resolver?.resolve();
        ackResolversRef.current.delete(event.seq);
        return;
      }

      store.dispatch(event);

      if (event.type === "WINDOW_UPDATE") {
        layoutRef.current = event.window.layout;
        seqRef.current    = event.window.seq;
      }
    };

    worker.onerror = (e) => {
      store.setStatus("error", `Worker error: ${e.message}`);
      // Reject all pending ACK promises so the ingestion pump does not stall
      // indefinitely awaiting an ACK the crashed worker will never emit.
      const err = new Error(`Worker crashed: ${e.message ?? "unknown error"}`);
      ackResolversRef.current.forEach(({ reject }) => reject(err));
      ackResolversRef.current.clear();
    };

    const initCmd: WorkerCommand = {
      type:           "INIT",
      schema:         schemaRef.current,
      charWidthHint:  asPixelSize(charWidthHint),
      rowHeightHint:  asPixelSize(rowHeightHint),
      viewportHeight: asPixelSize(initialViewportHeight),
    };
    worker.postMessage(initCmd);

    return () => {
      worker.postMessage({ type: "TERMINATE" } satisfies WorkerCommand);
      worker.terminate();
      workerRef.current = null;
      // Resolve cleanly — TERMINATE is a controlled shutdown, not a crash.
      ackResolversRef.current.forEach(({ resolve }) => resolve());
      ackResolversRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once — schema changes require a new mount

  // ── Frame timing: measure real paint time, report via FRAME_ACK ──────────────

  useEffect(() => {
    const start = performance.now();
    let rafId: number;

    rafId = requestAnimationFrame(() => {
      const renderMs = asMs(performance.now() - start);
      workerRef.current?.postMessage({
        type:     "FRAME_ACK",
        renderMs,
        seq:      seqRef.current,
      } satisfies WorkerCommand);
    });

    return () => cancelAnimationFrame(rafId);
  }); // no deps — runs after every render

  // ── Scroll handler ────────────────────────────────────────────────────────────

  const handleScroll = useCallback(() => {
    const el  = containerRef_internal.current;
    const lay = layoutRef.current;
    if (!el || !lay || lay.rowHeight === 0) return;

    const startRow = asRowIndex(Math.floor(el.scrollTop / lay.rowHeight));
    const rowCount = lay.viewportRows + overscanRows * 2;

    workerRef.current?.postMessage({
      type: "SET_WINDOW",
      startRow,
      rowCount,
    } satisfies WorkerCommand);
  }, [overscanRows]);

  // ── containerRef callback ─────────────────────────────────────────────────────

  const containerRef = useCallback(
    (el: HTMLElement | null) => {
      if (containerRef_internal.current) {
        containerRef_internal.current.removeEventListener("scroll", handleScroll);
        roRef.current?.disconnect();
        roRef.current = null;
      }

      containerRef_internal.current = el;
      if (!el) return;

      el.addEventListener("scroll", handleScroll, { passive: true });

      const initialH = asPixelSize(el.getBoundingClientRect().height || initialViewportHeight);
      workerRef.current?.postMessage({
        type:   "RESIZE_VIEWPORT",
        height: initialH,
      } satisfies WorkerCommand);

      const ro = new ResizeObserver(([entry]) => {
        const h = asPixelSize(
          entry!.borderBoxSize?.[0]?.blockSize ?? entry!.contentRect.height,
        );
        workerRef.current?.postMessage({
          type:   "RESIZE_VIEWPORT",
          height: h,
        } satisfies WorkerCommand);
      });
      ro.observe(el);
      roRef.current = ro;
    },
    [handleScroll, initialViewportHeight],
  );

  // ── Stream ingestion pipeline — one batch in flight at a time ─────────────────
  //
  // Flow:
  //   1. reader.read() → ArrayBuffer batch
  //   2. Register ACK promise in ackResolversRef (before postMessage)
  //   3. postMessage(INGEST, [buffer]) — transfers ownership, zero-copy
  //   4. await ack — blocks until worker emits INGEST_ACK for this seq
  //   5. Loop
  //
  // IPC queue depth is bounded to 1 regardless of dataset size.

  const ingest = useCallback(
    (stream: ReadableStream<ArrayBuffer>): (() => void) => {
      const controller = new AbortController();
      const reader     = stream.getReader();
      let   batchSeq   = 0;

      store.setStatus("streaming");

      const pump = async (): Promise<void> => {
        try {
          while (!controller.signal.aborted) {
            const { done, value } = await reader.read();

            if (done) {
              store.setStatus("complete");
              return;
            }

            const seq    = asBatchSeq(batchSeq++);
            const worker = workerRef.current;

            if (!worker) {
              store.setStatus("error", "Worker not initialized");
              return;
            }

            // Register the ACK resolver BEFORE postMessage to avoid a race
            // where the worker processes the batch and emits INGEST_ACK before
            // the Promise is constructed.
            const ack = new Promise<void>((resolve, reject) => {
              ackResolversRef.current.set(seq, { resolve, reject });
              // Unblock immediately if the stream is cancelled while we wait.
              controller.signal.addEventListener(
                "abort",
                () => {
                  ackResolversRef.current.delete(seq);
                  reject(new DOMException("Aborted", "AbortError"));
                },
                { once: true },
              );
            });

            worker.postMessage(
              { type: "INGEST", buffer: value, seq } satisfies WorkerCommand,
              [value],
            );

            await ack;
          }
        } catch (e) {
          if (!controller.signal.aborted) {
            store.setStatus("error", String(e));
          }
        } finally {
          reader.releaseLock();
        }
      };

      void pump();

      return () => {
        controller.abort();
        reader.cancel().catch(() => undefined);
      };
    },
    [store],
  );

  // ── scrollToRow ───────────────────────────────────────────────────────────────

  const scrollToRow = useCallback((row: number) => {
    const el  = containerRef_internal.current;
    const lay = layoutRef.current;
    if (!el || !lay) return;

    el.scrollTo({ top: row * lay.rowHeight, behavior: "smooth" });
    workerRef.current?.postMessage({
      type:     "SET_WINDOW",
      startRow: asRowIndex(Math.max(0, row - overscanRows)),
      rowCount: lay.viewportRows + overscanRows * 2,
    } satisfies WorkerCommand);
  }, [overscanRows]);

  return useMemo(
    () => ({ containerRef, store, ingest, scrollToRow }),
    [containerRef, store, ingest, scrollToRow],
  );
}
