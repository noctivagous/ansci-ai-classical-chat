#!/usr/bin/env node
/**
 * server.mjs — a small web chat UI for the CSKG spike.
 *
 *   node demo/web/server.mjs            (then open http://localhost:4173)
 *   PORT=8080 node demo/web/server.mjs  (different port)
 *
 * Zero dependencies: Node's http module serves one self-contained
 * page and a two-route JSON API. The CSKG graph is loaded ONCE at
 * startup (~27 s for the 4.8M-edge index) from the compiled spike in
 * dist/src/cskg/ — all conversation behaviour comes from that code
 * (converse.ts); this file only carries messages to and from it.
 * One demo session lives server-side, so follow-ups, corrections and
 * "why did you say that?" work across posts.
 *
 * Location configuration is the same as the CLI chat:
 *   CSKG_CHAT_LOCATION=Chicago CSKG_CHAT_HEMISPHERE=north
 */
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = Number(process.env.PORT) || 4173;
const require = createRequire(import.meta.url);

const { loadCskg } = require(join(ROOT, "dist", "src", "cskg", "loader.js"));
const { createSession, runTurn } = require(join(ROOT, "dist", "src", "cskg", "converse.js"));
const { computeSituation } = require(join(ROOT, "dist", "src", "cskg", "situation.js"));

const DATA_FILE =
  process.env.CSKG_PATH ?? join(ROOT, "data", "raw", "cskg", "cskg.tsv.gz");

if (!existsSync(DATA_FILE)) {
  console.error(
    `CSKG data not found at ${DATA_FILE}.\nRun the install first, from the repo root:\n\n  node scripts/install.mjs\n`,
  );
  process.exit(1);
}
if (!existsSync(join(ROOT, "dist", "src", "cskg", "converse.js"))) {
  console.error(
    "The CSKG chat is not built yet (dist/ is missing).\nRun the install first, from the repo root:\n\n  node scripts/install.mjs\n",
  );
  process.exit(1);
}

/* ---------------- graph loading (once) ---------------- */

let graph = null;
let loadError = null;
const session = createSession();
const loadStarted = Date.now();

console.log(`loading CSKG from ${DATA_FILE} … (one-off, ~30 s)`);
loadCskg(DATA_FILE)
  .then((g) => {
    graph = g;
    const st = g.stats;
    console.log(
      `loaded: ${st.edges.toLocaleString()} edges / ${st.terms.toLocaleString()} terms ` +
        `in ${((Date.now() - loadStarted) / 1000).toFixed(1)}s`,
    );
    console.log(`\nAnSci CSKG chat UI: http://localhost:${PORT}`);
  })
  .catch((err) => {
    loadError = err;
    console.error("failed to load CSKG:", err);
  });

/* ---------------- the page ---------------- */

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AnSci — CSKG chat</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #f4f4f1; color: #1d1d1b;
    font: 16px/1.5 -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  .wrap { max-width: 720px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; }
  header {
    padding: 18px 20px 12px; display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
  }
  header h1 { font-size: 20px; margin: 0; font-weight: 650; }
  header .sub { color: #6b6b66; font-size: 13px; }
  .chip {
    margin-left: auto; background: #e9e7e0; color: #44443f; border-radius: 999px;
    padding: 3px 12px; font-size: 13px; white-space: nowrap;
  }
  #messages { flex: 1; overflow-y: auto; padding: 8px 20px 16px; display: flex; flex-direction: column; gap: 10px; }
  .msg { max-width: 82%; padding: 9px 14px; border-radius: 14px; white-space: pre-wrap; word-wrap: break-word; }
  .msg.user { align-self: flex-end; background: #2563eb; color: #fff; border-bottom-right-radius: 4px; }
  .msg.bot { align-self: flex-start; background: #fff; border: 1px solid #e2e0d9; border-bottom-left-radius: 4px; }
  .msg.note { align-self: center; background: none; color: #8a8a83; font-size: 13px; padding: 2px; }
  form {
    display: flex; gap: 8px; padding: 12px 20px 20px; position: sticky; bottom: 0; background: #f4f4f1;
  }
  input[type=text] {
    flex: 1; padding: 11px 14px; font-size: 16px; border: 1px solid #cfcdc4; border-radius: 10px; background: #fff;
  }
  input[type=text]:focus { outline: 2px solid #2563eb; outline-offset: 0; border-color: transparent; }
  button {
    padding: 11px 20px; font-size: 16px; border: 0; border-radius: 10px;
    background: #2563eb; color: #fff; cursor: pointer;
  }
  button:disabled { background: #a9a9a2; cursor: default; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>AnSci</h1>
    <span class="sub">a chat over the CSKG commonsense graph — answers come from the graph, and it says so when the graph has nothing</span>
    <span class="chip" id="chip">loading the graph…</span>
  </header>
  <div id="messages"></div>
  <form id="composer">
    <input type="text" id="input" placeholder="Ask what something is for, what it causes — or just tell me something…" autocomplete="off">
    <button type="submit" id="send">Send</button>
  </form>
</div>
<script>
  var messages = document.getElementById('messages');
  var input = document.getElementById('input');
  var send = document.getElementById('send');
  var chip = document.getElementById('chip');
  var ready = false;

  function add(text, cls) {
    var div = document.createElement('div');
    div.className = 'msg ' + cls;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function refreshStatus() {
    fetch('/api/status').then(function (r) { return r.json(); }).then(function (s) {
      ready = s.ready;
      if (!s.ready) { chip.textContent = 'loading the graph…'; return; }
      var sit = s.situation || {};
      var parts = [];
      if (sit.place) parts.push(sit.place);
      if (sit.season) parts.push(sit.season);
      if (sit.daypart) parts.push(sit.daypart);
      if (sit.time) parts.push(sit.time);
      chip.textContent = parts.length ? parts.join(' \\u2022 ') : 'somewhere, sometime';
    }).catch(function () { /* server hiccup; next poll retries */ });
  }
  refreshStatus();
  setInterval(refreshStatus, 20000);

  add('Ask me what things are for, what they cause, where they are found — or just tell me something, like "I\\'m making soup on Saturday." I answer only from the graph. Try "why did you say that?" after any answer.', 'bot');

  document.getElementById('composer').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    add(text, 'user');
    input.value = '';
    send.disabled = true;
    input.disabled = true;
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    }).then(function (r) { return r.json(); }).then(function (data) {
      add(data.reply || data.error || '(no reply)', 'bot');
    }).catch(function () {
      add('That request failed — is the server still running?', 'bot');
    }).finally(function () {
      send.disabled = false;
      input.disabled = false;
      input.focus();
    });
  });
  input.focus();
</script>
</body>
</html>
`;

/* ---------------- API ---------------- */

function statusJson() {
  const sit = computeSituation(new Date());
  return {
    ready: graph !== null,
    situation: {
      place: sit.place ? sit.place.name : null,
      hemisphere: sit.place ? (sit.place.hemisphere ?? null) : null,
      season: sit.season,
      daypart: sit.daypart,
      time: sit.now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    },
  };
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(PAGE);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/status") {
    sendJson(res, 200, statusJson());
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/chat") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) req.destroy();
    });
    req.on("end", () => {
      let message = "";
      try {
        message = String(JSON.parse(raw || "{}").message ?? "").trim();
      } catch {
        sendJson(res, 400, { error: "request body must be JSON like {\"message\": \"…\"}" });
        return;
      }
      if (!message) {
        sendJson(res, 400, { error: "message is empty" });
        return;
      }
      if (loadError) {
        sendJson(res, 500, { reply: "The graph failed to load on the server — check its console output." });
        return;
      }
      if (!graph) {
        sendJson(res, 200, {
          reply: "Still loading the graph — it takes about half a minute. Try again in a few seconds.",
        });
        return;
      }
      try {
        const result = runTurn(graph, session, message);
        sendJson(res, 200, { reply: result.text });
      } catch (err) {
        console.error("runTurn failed:", err);
        sendJson(res, 500, { reply: "Something went wrong answering that — the server logged it." });
      }
    });
    return;
  }
  sendJson(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`web UI listening on http://localhost:${PORT} (graph loading in the background)`);
});
