import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

// The /chat/ app: a second Vite build inside the dashboard project.
// Its root is this directory (chat/), and it emits into the site
// build's dist/chat/, so the one `npm run build` in demo/dashboard
// produces the whole site — / (the schematic map page, copied from
// root/index.html), /dashboard/ (the dashboard app) and /chat/
// (this app) — and wrangler's pinned assets directory (./dist)
// serves all three. Node disk-loading paths are stubbed, and the required
// lexical providers are installed from same-origin assets before chat runs.
const stub = fileURLToPath(new URL("../src/node-stub.ts", import.meta.url));
const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: here,
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
    outDir: fileURLToPath(new URL("../dist/chat", import.meta.url)),
    emptyOutDir: false,
  },
});
