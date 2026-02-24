import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { mergeRefs } from "../internal/merge-refs";

describe("mergeRefs", () => {
  it("calls a function ref with the value", () => {
    const fn = vi.fn();
    const merged = mergeRefs(fn);
    const el = document.createElement("div");
    merged(el);
    expect(fn).toHaveBeenCalledWith(el);
  });

  it("sets an object ref's current", () => {
    const ref = createRef<HTMLElement>();
    const merged = mergeRefs(ref);
    const el = document.createElement("div");
    merged(el);
    expect(ref.current).toBe(el);
  });

  it("handles null and undefined refs gracefully", () => {
    const fn = vi.fn();
    const merged = mergeRefs(null, undefined, fn);
    const el = document.createElement("div");
    merged(el);
    expect(fn).toHaveBeenCalledWith(el);
  });

  it("forwards to multiple refs", () => {
    const fn = vi.fn();
    const objRef = createRef<HTMLElement>();
    const merged = mergeRefs(fn, objRef);
    const el = document.createElement("div");
    merged(el);
    expect(fn).toHaveBeenCalledWith(el);
    expect(objRef.current).toBe(el);
  });

  it("passes null to all refs on cleanup (unmount)", () => {
    const fn = vi.fn();
    const objRef = createRef<HTMLElement>();
    const merged = mergeRefs(fn, objRef);
    const el = document.createElement("div");
    merged(el);

    // Simulate unmount
    merged(null);
    expect(fn).toHaveBeenCalledWith(null);
    expect(objRef.current).toBeNull();
  });
});
