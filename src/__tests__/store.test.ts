import { describe, it, expect, vi } from "vitest";
import { ConcertinaStore } from "../accordion/store";

describe("ConcertinaStore", () => {
  it("starts with empty value", () => {
    const store = new ConcertinaStore();
    expect(store.getValue()).toBe("");
  });

  it("setValue updates value and notifies listeners", () => {
    const store = new ConcertinaStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setValue("item-1");
    expect(store.getValue()).toBe("item-1");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("setValue with empty string normalizes to empty", () => {
    const store = new ConcertinaStore();
    store.setValue("item-1");
    store.setValue("");
    expect(store.getValue()).toBe("");
  });

  it("subscribe returns unsubscribe function", () => {
    const store = new ConcertinaStore();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    store.setValue("a");
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.setValue("b");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("notifies multiple listeners", () => {
    const store = new ConcertinaStore();
    const l1 = vi.fn();
    const l2 = vi.fn();
    store.subscribe(l1);
    store.subscribe(l2);

    store.setValue("x");
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it("stores and retrieves item refs", () => {
    const store = new ConcertinaStore();
    const el = document.createElement("div");

    store.setItemRef("item-1", el);
    expect(store.getItemRef("item-1")).toBe(el);
    expect(store.getItemRef("missing")).toBeNull();
  });

  it("clears item ref when set to null", () => {
    const store = new ConcertinaStore();
    const el = document.createElement("div");

    store.setItemRef("item-1", el);
    store.setItemRef("item-1", null);
    expect(store.getItemRef("item-1")).toBeNull();
  });
});
