import { describe, it, expect, vi } from "vitest";
import { AtomicStore } from "../core/atomic-store";
import {
  asBatchSeq,
  asMs,
  asPixelSize,
  asRowIndex,
  INITIAL_STORE_STATE,
  type ViewportLayout,
  type DataWindow,
} from "../core/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockLayout: ViewportLayout = {
  columns:      [],
  rowHeight:    asPixelSize(36),
  totalRows:    0,
  totalHeight:  asPixelSize(0),
  viewportRows: 10,
};

const mockWindow: DataWindow = {
  seq:      asBatchSeq(0),
  startRow: asRowIndex(0),
  rowCount: 10,
  layout:   mockLayout,
  buffer:   new ArrayBuffer(0),
};

// ─── AtomicStore ──────────────────────────────────────────────────────────────

describe("AtomicStore — initial state", () => {
  it("matches INITIAL_STORE_STATE", () => {
    const store = new AtomicStore();
    expect(store.getState()).toEqual(INITIAL_STORE_STATE);
  });

  it("status starts as idle", () => {
    const store = new AtomicStore();
    expect(store.getState().status).toBe("idle");
  });
});

describe("AtomicStore — subscribe / unsubscribe", () => {
  it("notifies listeners on state change", () => {
    const store    = new AtomicStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setStatus("streaming");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("returns an unsubscribe function that stops notifications", () => {
    const store    = new AtomicStore();
    const listener = vi.fn();
    const unsub    = store.subscribe(listener);

    store.setStatus("streaming");
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.setStatus("complete");
    expect(listener).toHaveBeenCalledTimes(1); // no additional call
  });

  it("notifies multiple independent listeners", () => {
    const store = new AtomicStore();
    const l1    = vi.fn();
    const l2    = vi.fn();
    store.subscribe(l1);
    store.subscribe(l2);
    store.setStatus("complete");
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it("unsubscribing one listener does not affect others", () => {
    const store = new AtomicStore();
    const l1    = vi.fn();
    const l2    = vi.fn();
    const unsub = store.subscribe(l1);
    store.subscribe(l2);

    unsub();
    store.setStatus("streaming");
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledTimes(1);
  });
});

describe("AtomicStore — setStatus", () => {
  it("transitions to streaming", () => {
    const store = new AtomicStore();
    store.setStatus("streaming");
    expect(store.getState().status).toBe("streaming");
  });

  it("transitions to complete", () => {
    const store = new AtomicStore();
    store.setStatus("complete");
    expect(store.getState().status).toBe("complete");
  });

  it("records error message on error status", () => {
    const store = new AtomicStore();
    store.setStatus("error", "disk full");
    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("disk full");
  });

  it("preserves existing error when called without a message", () => {
    const store = new AtomicStore();
    store.setStatus("error", "original error");
    store.setStatus("error"); // no new message
    expect(store.getState().error).toBe("original error");
  });
});

describe("AtomicStore — dispatch LAYOUT_READY", () => {
  it("stores layout and transitions to streaming", () => {
    const store = new AtomicStore();
    store.dispatch({ type: "LAYOUT_READY", layout: mockLayout });

    const state = store.getState();
    expect(state.layout).toBe(mockLayout);
    expect(state.status).toBe("streaming");
  });
});

describe("AtomicStore — dispatch WINDOW_UPDATE", () => {
  it("updates window, layout, and totalRows together", () => {
    const store  = new AtomicStore();
    const layout = { ...mockLayout, totalRows: 42 };
    const win    = { ...mockWindow, layout };

    store.dispatch({ type: "WINDOW_UPDATE", window: win });

    const state = store.getState();
    expect(state.window).toBe(win);
    expect(state.layout).toBe(layout);
    expect(state.totalRows).toBe(42);
  });
});

describe("AtomicStore — dispatch BACKPRESSURE", () => {
  it("updates backpressure state", () => {
    const store  = new AtomicStore();
    const bpState = {
      strategy:    "BUFFER" as const,
      queueDepth:  3,
      avgRenderMs: asMs(18),
    };

    store.dispatch({ type: "BACKPRESSURE", state: bpState });
    expect(store.getState().backpressure).toBe(bpState);
  });
});

describe("AtomicStore — dispatch TOTAL_ROWS_UPDATED", () => {
  it("updates totalRows when value changes", () => {
    const store = new AtomicStore();
    store.dispatch({ type: "TOTAL_ROWS_UPDATED", totalRows: 100 });
    expect(store.getState().totalRows).toBe(100);
  });

  it("does not notify listeners when value is unchanged", () => {
    const store    = new AtomicStore();
    const listener = vi.fn();

    // Set initial totalRows via WINDOW_UPDATE so it equals 50
    const layout = { ...mockLayout, totalRows: 50 };
    store.dispatch({ type: "WINDOW_UPDATE", window: { ...mockWindow, layout } });
    store.subscribe(listener);

    // Dispatching same value should not trigger a notification
    store.dispatch({ type: "TOTAL_ROWS_UPDATED", totalRows: 50 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("notifies listeners when value changes", () => {
    const store    = new AtomicStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.dispatch({ type: "TOTAL_ROWS_UPDATED", totalRows: 200 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().totalRows).toBe(200);
  });
});

describe("AtomicStore — dispatch INGEST_ERROR", () => {
  it("transitions to error with formatted message", () => {
    const store = new AtomicStore();
    store.dispatch({
      type:    "INGEST_ERROR",
      seq:     asBatchSeq(3),
      message: "schema mismatch: expected f64, got utf8",
    });

    const state = store.getState();
    expect(state.status).toBe("error");
    expect(state.error).toContain("Batch 3");
    expect(state.error).toContain("schema mismatch");
  });
});

describe("AtomicStore — state immutability", () => {
  it("returns a new state object after each dispatch", () => {
    const store  = new AtomicStore();
    const before = store.getState();

    store.setStatus("streaming");
    const after = store.getState();

    expect(after).not.toBe(before);
    expect(before.status).toBe("idle");    // original unchanged
    expect(after.status).toBe("streaming");
  });
});
