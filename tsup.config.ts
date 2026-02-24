import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/accordion.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  jsx: "automatic",
  external: ["react", "react-dom"],
  noExternal: [/^@radix-ui/],
});
