import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// The library's inject-styles.ts does `import css from "../styles.css"` which
// tsup handles (returns a string), but Vite needs the `?inline` suffix to
// return CSS as a string instead of injecting it as a side-effect.
function concertinaCssInline(): Plugin {
  const stylesPath = path.resolve(__dirname, "../src/styles.css");
  return {
    name: "concertina-css-inline",
    enforce: "pre",
    resolveId(source, importer) {
      if (
        source === "../styles.css" &&
        importer &&
        importer.includes(path.join("src", "internal", "inject-styles"))
      ) {
        return stylesPath + "?inline";
      }
    },
  };
}

export default defineConfig({
  base: "/concertina/",
  plugins: [concertinaCssInline(), react(), tailwindcss()],
  server: {
    fs: {
      allow: [
        // Allow serving the parent repo source (aliased imports + worker).
        path.resolve(__dirname, ".."),
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Resolve concertina from the parent repo source so the demo
      // works without a published package. More-specific paths first.
      "concertina/core": path.resolve(__dirname, "../src/core/index.ts"),
      "concertina/accordion": path.resolve(
        __dirname,
        "../src/accordion/index.ts",
      ),
      concertina: path.resolve(__dirname, "../src/index.ts"),
    },
  },
});
