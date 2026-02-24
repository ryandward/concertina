import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the CSS import with representative content (vitest stubs CSS imports to empty string)
const MOCK_CSS = `.concertina-stable-slot { display: grid; }
.concertina-warmup-line { height: 1lh; }
.concertina-gigbag { contain: layout style; }`;

vi.mock("../styles.css", () => ({ default: MOCK_CSS }));

beforeEach(() => {
  document.head.innerHTML = "";
  vi.resetModules();
});

describe("injectStyles", () => {
  it("injects a <style data-concertina> element", async () => {
    const { injectStyles } = await import("../internal/inject-styles");
    injectStyles();
    const style = document.querySelector("style[data-concertina]");
    expect(style).not.toBeNull();
  });

  it("is idempotent, second call does not add duplicate", async () => {
    const { injectStyles } = await import("../internal/inject-styles");
    injectStyles();
    injectStyles();
    const styles = document.querySelectorAll("style[data-concertina]");
    expect(styles.length).toBe(1);
  });

  it("skips injection if style tag already exists", async () => {
    const existing = document.createElement("style");
    existing.setAttribute("data-concertina", "");
    existing.textContent = "/* existing */";
    document.head.appendChild(existing);

    const { injectStyles } = await import("../internal/inject-styles");
    injectStyles();

    const styles = document.querySelectorAll("style[data-concertina]");
    expect(styles.length).toBe(1);
    expect(styles[0].textContent).toBe("/* existing */");
  });

  it("contains expected CSS selectors", async () => {
    const { injectStyles } = await import("../internal/inject-styles");
    injectStyles();
    const style = document.querySelector("style[data-concertina]");
    const text = style?.textContent ?? "";
    expect(text).toContain(".concertina-stable-slot");
    expect(text).toContain(".concertina-warmup-line");
    expect(text).toContain(".concertina-gigbag");
  });

  it("is a no-op when document is undefined (SSR)", async () => {
    const originalDoc = globalThis.document;
    // @ts-expect-error simulate SSR
    delete globalThis.document;
    try {
      const { injectStyles } = await import("../internal/inject-styles");
      expect(() => injectStyles()).not.toThrow();
    } finally {
      globalThis.document = originalDoc;
    }
  });
});
