import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

// Node disk-loading paths are stubbed in the browser. The required
// WordNet and FrameNet bundles are installed via browser-lexical-data.ts.
const stub = fileURLToPath(new URL("./src/node-stub.ts", import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: "./",
  // The dashboard app is served under /dashboard/; the site root (/) is
  // the schematic root page (root/index.html), copied into dist/ by the
  // build script after Vite emits the app into dist/dashboard/.
  build: {
    outDir: "dist/dashboard",
  },
  // src/framenet.ts resolves its bundle directory from __dirname at
  // module level; define it for the browser bundle's unused disk path.
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
});
