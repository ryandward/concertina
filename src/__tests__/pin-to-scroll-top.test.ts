import { describe, it, expect, vi } from "vitest";
import { pinToScrollTop } from "../primitives/pin-to-scroll-top";

describe("pinToScrollTop", () => {
  it("does nothing when el is null", () => {
    expect(() => pinToScrollTop(null)).not.toThrow();
  });

  it("adjusts scrollTop of scrollable parent", () => {
    const parent = document.createElement("div");
    const child = document.createElement("div");
    parent.appendChild(child);
    document.body.appendChild(parent);

    // Make parent scrollable
    Object.defineProperty(parent, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(parent, "clientHeight", { value: 200, configurable: true });
    parent.scrollTop = 0;

    vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
      if (el === parent) {
        return { overflowY: "auto", position: "" } as CSSStyleDeclaration;
      }
      return { overflowY: "visible", position: "" } as CSSStyleDeclaration;
    });

    vi.spyOn(parent, "getBoundingClientRect").mockReturnValue({
      top: 0, left: 0, bottom: 200, right: 100, width: 100, height: 200, x: 0, y: 0, toJSON() {},
    });
    vi.spyOn(child, "getBoundingClientRect").mockReturnValue({
      top: 50, left: 0, bottom: 70, right: 100, width: 100, height: 20, x: 0, y: 50, toJSON() {},
    });

    pinToScrollTop(child);
    expect(parent.scrollTop).toBe(50);

    document.body.removeChild(parent);
  });

  it("skips non-scrollable parents with overflow auto", () => {
    const outer = document.createElement("div");
    const inner = document.createElement("div");
    const child = document.createElement("div");
    outer.appendChild(inner);
    inner.appendChild(child);
    document.body.appendChild(outer);

    // inner has overflow:auto but doesn't actually scroll
    Object.defineProperty(inner, "scrollHeight", { value: 100, configurable: true });
    Object.defineProperty(inner, "clientHeight", { value: 100, configurable: true });
    // outer actually scrolls
    Object.defineProperty(outer, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(outer, "clientHeight", { value: 200, configurable: true });
    outer.scrollTop = 0;

    vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
      if (el === inner || el === outer) {
        return { overflowY: "auto", position: "" } as CSSStyleDeclaration;
      }
      return { overflowY: "visible", position: "" } as CSSStyleDeclaration;
    });

    vi.spyOn(outer, "getBoundingClientRect").mockReturnValue({
      top: 0, left: 0, bottom: 200, right: 100, width: 100, height: 200, x: 0, y: 0, toJSON() {},
    });
    vi.spyOn(child, "getBoundingClientRect").mockReturnValue({
      top: 80, left: 0, bottom: 100, right: 100, width: 100, height: 20, x: 0, y: 80, toJSON() {},
    });

    pinToScrollTop(child);
    // Should skip inner (not scrollable), adjust outer
    expect(outer.scrollTop).toBe(80);

    document.body.removeChild(outer);
  });
});
