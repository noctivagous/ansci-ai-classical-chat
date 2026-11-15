import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

// The fork engine's optional data providers (WordNet extract, FrameNet
// bundle) load from disk under Node. In the browser build they are
// stubbed out: the providers detect the failure and disable themselves,
// and the dashboard labels them OFF rather than pretending otherwise.
const stub = fileURLToPath(new URL("./src/node-stub.ts", import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: "./",
  // src/framenet.ts resolves its bundle directory from __dirname at
  // module level (harmless under Node's CJS build). Give the browser
  // bundle a defined value; the fs stub then reports the bundle absent
  // and the provider disables itself, as designed.
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
