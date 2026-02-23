import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useScrollPin } from "../primitives/use-scroll-pin";
import * as pinModule from "../primitives/pin-to-scroll-top";

describe("useScrollPin", () => {
  it("calls pinToScrollTop on mount when element exists", () => {
    const el = document.createElement("div");
    const spy = vi.spyOn(pinModule, "pinToScrollTop").mockImplementation(() => {});

    renderHook(() => useScrollPin(() => el, [el]));
    expect(spy).toHaveBeenCalledWith(el);

    spy.mockRestore();
  });

  it("skips pinToScrollTop when getElement returns null", () => {
    const spy = vi.spyOn(pinModule, "pinToScrollTop").mockImplementation(() => {});

    renderHook(() => useScrollPin(() => null, ["dep"]));
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it("calls pinToScrollTop again when deps change", () => {
    const el = document.createElement("div");
    const spy = vi.spyOn(pinModule, "pinToScrollTop").mockImplementation(() => {});

    const { rerender } = renderHook(
      ({ dep }) => useScrollPin(() => el, [dep]),
      { initialProps: { dep: "a" } }
    );
    expect(spy).toHaveBeenCalledTimes(1);

    rerender({ dep: "b" });
    expect(spy).toHaveBeenCalledTimes(2);

    spy.mockRestore();
  });

  it("does not call pinToScrollTop when deps are stable", () => {
    const el = document.createElement("div");
    const spy = vi.spyOn(pinModule, "pinToScrollTop").mockImplementation(() => {});

    const { rerender } = renderHook(
      ({ dep }) => useScrollPin(() => el, [dep]),
      { initialProps: { dep: "a" } }
    );
    expect(spy).toHaveBeenCalledTimes(1);

    rerender({ dep: "a" });
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
