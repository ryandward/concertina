import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStableSlot } from "../primitives/use-stable-slot";

let observerCallback: ResizeObserverCallback;
let observedElement: Element | null = null;
let observeOptions: ResizeObserverOptions | undefined;
let lastInstance: { disconnect: ReturnType<typeof vi.fn> } | null = null;

beforeEach(() => {
  observedElement = null;
  observeOptions = undefined;
  lastInstance = null;

  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect = vi.fn();
      unobserve = vi.fn();
      constructor(cb: ResizeObserverCallback) {
        observerCallback = cb;
        lastInstance = this as any;
      }
      observe(target: Element, options?: ResizeObserverOptions) {
        observedElement = target;
        observeOptions = options;
      }
    }
  );
});

function fireResize(target: Element, w: number, h: number) {
  observerCallback(
    [
      {
        target,
        borderBoxSize: [{ inlineSize: w, blockSize: h }],
        contentBoxSize: [{ inlineSize: w, blockSize: h }],
        devicePixelContentBoxSize: [],
        contentRect: { width: w, height: h, top: 0, left: 0, bottom: h, right: w, x: 0, y: 0, toJSON() {} },
      } as unknown as ResizeObserverEntry,
    ],
    {} as ResizeObserver
  );
}

describe("useStableSlot", () => {
  it("returns ref and empty initial style", () => {
    const { result } = renderHook(() => useStableSlot());
    expect(typeof result.current.ref).toBe("function");
    expect(result.current.style).toEqual({});
  });

  it("observes element with border-box", () => {
    const { result } = renderHook(() => useStableSlot());
    const el = document.createElement("div");
    act(() => result.current.ref(el));
    expect(observedElement).toBe(el);
    expect(observeOptions).toEqual({ box: "border-box" });
  });

  it("ratchets up — sets minWidth and minHeight on resize", () => {
    const { result } = renderHook(() => useStableSlot());
    const el = document.createElement("div");
    act(() => result.current.ref(el));

    act(() => fireResize(el, 100, 50));
    expect(result.current.style).toEqual({ minWidth: 100, minHeight: 50 });

    // Larger — should update
    act(() => fireResize(el, 200, 50));
    expect(result.current.style).toEqual({ minWidth: 200, minHeight: 50 });
  });

  it("does not shrink — ratchet is one-way", () => {
    const { result } = renderHook(() => useStableSlot());
    const el = document.createElement("div");
    act(() => result.current.ref(el));

    act(() => fireResize(el, 200, 100));
    expect(result.current.style).toEqual({ minWidth: 200, minHeight: 100 });

    // Smaller — should NOT update
    act(() => fireResize(el, 150, 80));
    expect(result.current.style).toEqual({ minWidth: 200, minHeight: 100 });
  });

  it("axis=width only tracks width", () => {
    const { result } = renderHook(() => useStableSlot({ axis: "width" }));
    const el = document.createElement("div");
    act(() => result.current.ref(el));

    act(() => fireResize(el, 100, 50));
    expect(result.current.style).toEqual({ minWidth: 100 });
    expect(result.current.style).not.toHaveProperty("minHeight");
  });

  it("axis=height only tracks height", () => {
    const { result } = renderHook(() => useStableSlot({ axis: "height" }));
    const el = document.createElement("div");
    act(() => result.current.ref(el));

    act(() => fireResize(el, 100, 50));
    expect(result.current.style).toEqual({ minHeight: 50 });
    expect(result.current.style).not.toHaveProperty("minWidth");
  });

  it("disconnects observer when ref set to null", () => {
    const { result } = renderHook(() => useStableSlot());
    const el = document.createElement("div");
    act(() => result.current.ref(el));

    const instance = lastInstance!;
    act(() => result.current.ref(null));
    expect(instance.disconnect).toHaveBeenCalled();
  });
});
