import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useArrayIngest } from "../core/use-array-ingest";
import { BATCH_MAGIC, asBatchSeq, type ColumnSchema } from "../core/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const schema: ColumnSchema[] = [
  { name: "id", type: "utf8", maxContentChars: 10 },
  { name: "val", type: "f64", maxContentChars: 8 },
];

/** Collect all ArrayBuffers from a ReadableStream. */
async function drain(stream: ReadableStream<ArrayBuffer>): Promise<ArrayBuffer[]> {
  const reader = stream.getReader();
  const chunks: ArrayBuffer[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return chunks;
}

function header(buf: ArrayBuffer) {
  const v = new DataView(buf);
  return {
    magic: v.getUint32(0, true),
    seq: v.getUint32(4, true),
    rowCount: v.getUint32(8, true),
    colCount: v.getUint32(12, true),
  };
}

type IngestFn = (stream: ReadableStream<ArrayBuffer>) => () => void;

function makeOrchestrator() {
  let lastStream: ReadableStream<ArrayBuffer> | null = null;
  let cancelCalled = false;

  const ingest: IngestFn = (stream) => {
    lastStream = stream;
    cancelCalled = false;
    return () => {
      cancelCalled = true;
    };
  };

  return {
    orchestrator: { ingest },
    getLastStream: () => lastStream,
    wasCancelled: () => cancelCalled,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useArrayIngest", () => {
  it("skips ingestion when data is null", () => {
    const { orchestrator, getLastStream } = makeOrchestrator();

    renderHook(() => useArrayIngest(orchestrator, schema, null));

    expect(getLastStream()).toBeNull();
  });

  it("skips ingestion when data is undefined", () => {
    const { orchestrator, getLastStream } = makeOrchestrator();

    renderHook(() => useArrayIngest(orchestrator, schema, undefined));

    expect(getLastStream()).toBeNull();
  });

  it("skips ingestion when data is an empty array", () => {
    const { orchestrator, getLastStream } = makeOrchestrator();

    renderHook(() => useArrayIngest(orchestrator, schema, []));

    expect(getLastStream()).toBeNull();
  });

  it("creates a stream and calls ingest when data is provided", () => {
    const { orchestrator, getLastStream } = makeOrchestrator();
    const data = [{ id: "a", val: 1 }];

    renderHook(() => useArrayIngest(orchestrator, schema, data));

    expect(getLastStream()).not.toBeNull();
  });

  it("encodes all rows into the stream with correct wire format", async () => {
    const { orchestrator, getLastStream } = makeOrchestrator();
    const data = [
      { id: "row-0", val: 1.5 },
      { id: "row-1", val: 2.5 },
      { id: "row-2", val: 3.5 },
    ];

    renderHook(() => useArrayIngest(orchestrator, schema, data));

    const stream = getLastStream()!;
    const chunks = await drain(stream);

    // Default chunkSize=1000, so 3 rows → 1 chunk
    expect(chunks).toHaveLength(1);

    const h = header(chunks[0]!);
    expect(h.magic).toBe(BATCH_MAGIC);
    expect(h.seq).toBe(0);
    expect(h.rowCount).toBe(3);
    expect(h.colCount).toBe(2);
  });

  it("chunks rows according to chunkSize option", async () => {
    const { orchestrator, getLastStream } = makeOrchestrator();
    const data = Array.from({ length: 5 }, (_, i) => ({
      id: `r${i}`,
      val: i,
    }));

    renderHook(() =>
      useArrayIngest(orchestrator, schema, data, { chunkSize: 2 }),
    );

    const stream = getLastStream()!;
    const chunks = await drain(stream);

    // 5 rows / chunkSize 2 → 3 chunks (2, 2, 1)
    expect(chunks).toHaveLength(3);
    expect(header(chunks[0]!).rowCount).toBe(2);
    expect(header(chunks[1]!).rowCount).toBe(2);
    expect(header(chunks[2]!).rowCount).toBe(1);

    // Monotonic seq numbers
    expect(header(chunks[0]!).seq).toBe(0);
    expect(header(chunks[1]!).seq).toBe(1);
    expect(header(chunks[2]!).seq).toBe(2);
  });

  it("cancels previous stream when data changes", () => {
    const cancelCalls: number[] = [];
    let callCount = 0;

    const orchestrator = {
      ingest: (_stream: ReadableStream<ArrayBuffer>) => {
        const myCall = callCount++;
        return () => {
          cancelCalls.push(myCall);
        };
      },
    };

    const data1 = [{ id: "a", val: 1 }];
    const data2 = [{ id: "b", val: 2 }];

    const { rerender } = renderHook(
      ({ data }) => useArrayIngest(orchestrator, schema, data),
      { initialProps: { data: data1 } },
    );

    expect(cancelCalls).toEqual([]);

    rerender({ data: data2 });

    // Cleanup from the first effect should have cancelled call 0
    expect(cancelCalls).toContain(0);
    // Two ingest calls total (one per data reference)
    expect(callCount).toBe(2);
  });

  it("cancels stream on unmount", () => {
    const { orchestrator, wasCancelled } = makeOrchestrator();
    const data = [{ id: "a", val: 1 }];

    const { unmount } = renderHook(() =>
      useArrayIngest(orchestrator, schema, data),
    );

    expect(wasCancelled()).toBe(false);

    unmount();

    expect(wasCancelled()).toBe(true);
  });

  it("does not re-trigger when orchestrator identity changes", () => {
    const ingestSpy = vi.fn<IngestFn>(() => () => {});
    const data = [{ id: "a", val: 1 }];

    const { rerender } = renderHook(
      ({ orch }) => useArrayIngest(orch, schema, data),
      { initialProps: { orch: { ingest: ingestSpy } } },
    );

    expect(ingestSpy).toHaveBeenCalledTimes(1);

    // New orchestrator object, same data reference → should NOT re-trigger
    rerender({ orch: { ingest: ingestSpy } });

    expect(ingestSpy).toHaveBeenCalledTimes(1);
  });
});
