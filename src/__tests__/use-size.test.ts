import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSize } from "../primitives/use-size";

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

describe("useSize", () => {
  it("returns ref and initial zero size", () => {
    const { result } = renderHook(() => useSize());
    expect(typeof result.current.ref).toBe("function");
    expect(result.current.size).toEqual({ width: 0, height: 0 });
  });

  it("observes element with border-box", () => {
    const { result } = renderHook(() => useSize());
    const el = document.createElement("div");
    act(() => result.current.ref(el));
    expect(observedElement).toBe(el);
    expect(observeOptions).toEqual({ box: "border-box" });
  });

  it("reports size on resize", () => {
    const { result } = renderHook(() => useSize());
    const el = document.createElement("div");
    act(() => result.current.ref(el));

    act(() => fireResize(el, 100, 50));
    expect(result.current.size).toEqual({ width: 100, height: 50 });
  });

  it("reports decreases — no ratchet", () => {
    const { result } = renderHook(() => useSize());
    const el = document.createElement("div");
    act(() => result.current.ref(el));

    act(() => fireResize(el, 200, 100));
    expect(result.current.size).toEqual({ width: 200, height: 100 });

    act(() => fireResize(el, 100, 50));
    expect(result.current.size).toEqual({ width: 100, height: 50 });
  });

  it("disconnects observer when ref set to null", () => {
    const { result } = renderHook(() => useSize());
    const el = document.createElement("div");
    act(() => result.current.ref(el));

    const instance = lastInstance!;
    act(() => result.current.ref(null));
    expect(instance.disconnect).toHaveBeenCalled();
  });

  it("disconnects previous observer when ref changes element", () => {
    const { result } = renderHook(() => useSize());
    const el1 = document.createElement("div");
    act(() => result.current.ref(el1));
    const firstInstance = lastInstance!;

    const el2 = document.createElement("div");
    act(() => result.current.ref(el2));
    expect(firstInstance.disconnect).toHaveBeenCalled();
    expect(observedElement).toBe(el2);
  });

  it("gracefully no-ops without ResizeObserver (SSR)", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { result } = renderHook(() => useSize());
    const el = document.createElement("div");
    // Should not throw
    act(() => result.current.ref(el));
    expect(result.current.size).toEqual({ width: 0, height: 0 });
  });
});
