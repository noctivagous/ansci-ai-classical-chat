#!/usr/bin/env node
/**
 * tui.mjs — placeholder for a future terminal UI.
 *
 * A full TUI is not built yet (see README.md in this directory).
 * This program prints a banner, says so plainly, and hands you to
 * the working command-line chat — same graph, same answers, plain
 * prompt — so you still end up chatting.
 *
 *   node demo/tui/tui.mjs
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHAT = join(ROOT, "dist", "src", "cskg", "chat.js");

console.log(
  [
    "",
    "  ┌──────────────────────────────────────────────┐",
    "  │  AnSci — CSKG chat (TUI placeholder)         │",
    "  └──────────────────────────────────────────────┘",
    "",
    "  A full terminal UI is planned but not built yet. What you get",
    "  for now is a hand-off to the working command-line chat: the",
    "  same graph, the same answers, at a plain prompt. The graph",
    "  takes about half a minute to load.",
    "",
  ].join("\n"),
);

if (!existsSync(CHAT)) {
  console.error(
    "  The chat isn't built yet. Run the install first, from the repo root:\n\n    node scripts/install.mjs\n",
  );
  process.exit(1);
}

const child = spawn(process.execPath, [CHAT], { cwd: ROOT, stdio: "inherit" });
child.on("error", (err) => {
  console.error(`could not start the chat: ${err.message}`);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 0));
