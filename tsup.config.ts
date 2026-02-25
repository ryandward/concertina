import { defineConfig } from "tsup";

export default defineConfig([
  // ── Public library entries ────────────────────────────────────────────────
  {
    entry: ["src/index.ts", "src/accordion.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    jsx: "automatic",
    external: ["react", "react-dom"],
    noExternal: [/^@radix-ui/],
    loader: { ".css": "text" },
  },
  // ── Core Stability Engine public entry ────────────────────────────────────
  {
    entry: { "core/index": "src/core/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    jsx: "automatic",
    external: ["react", "react-dom"],
  },
  // ── DataWorker: emitted as a standalone ESM module ────────────────────────
  // Must be ESM-only and must NOT be bundled with the main entry.
  // The orchestrator references it via new URL("./data-worker.js", import.meta.url).
  {
    entry: { "core/data-worker": "src/core/data-worker.ts" },
    format: ["esm"],
    dts: false,          // no .d.ts for worker — it has no public API
    platform: "browser",
    external: [],        // inline all imports — worker is self-contained
  },
]);
