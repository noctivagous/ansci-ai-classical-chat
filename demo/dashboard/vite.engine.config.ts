import { defineConfig } from "vite";
import { fileURLToPath } from "url";

// The live engine bundle for the schematic root page: src/engine-entry.ts
// (the real fork turn loop) built as a single IIFE script, dist/engine.js,
// sitting beside the root page at the site root. The page disables chat
// until this engine confirms the required browser datasets are ready.
// Node disk-loading paths are stubbed; lexical providers are installed
// through the browser data loader.
const stub = fileURLToPath(new URL("./src/node-stub.ts", import.meta.url));

export default defineConfig({
  base: "./",
  define: {
    __dirname: JSON.stringify("/"),
    __filename: JSON.stringify("/index.js"),
  },
  resolve: {
    alias: [
      { find: /^node:(fs|path|os|url|util)$/, replacement: stub },
      { find: /^(fs|path)$/, replacement: stub },
    ],
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL("./src/engine-entry.ts", import.meta.url)),
      name: "AnSciEngine",
      formats: ["iife"],
      fileName: () => "engine.js",
    },
  },
});
