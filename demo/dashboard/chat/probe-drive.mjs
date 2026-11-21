// Driven verification for the /chat/ page (throwaway probe, not shipped
// in dist — it lives beside the chat source and is run by hand):
// serves the built site (../dist) statically, drives the page with
// headless Chromium, and writes each check's result to a JSON file
// as it goes so a late failure keeps the evidence already gathered.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "/home/hatch/workspace/layout-tools/node_modules/playwright-core/index.mjs";

const DIST = new URL("../dist", import.meta.url).pathname;
const OUT = process.argv[2] || "/tmp/ansci-probe/drive-results.json";
const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
};

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = join(DIST, p);
  if (!existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const EXE = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`;
const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const replies = () => page.locator('[data-testid="transcript"] .line').allTextContents();
async function send(text) {
  await page.fill('[data-testid="composer-input"]', text);
  await page.click('[data-testid="composer-send"]');
  await page.waitForTimeout(120);
}

try {
  // ---- required lexical assets gate both browser chat surfaces ----
  await page.route("**/ansci-data/**", (route) => route.fulfill({ status: 503, body: "test: unavailable" }));
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#chatResourceStatus")?.dataset.state === "error");
  const rootBlocked = await page.locator("#chatResourceStatus").textContent();
  record("map: missing lexical data explains why chat is disabled", rootBlocked?.includes("WordNet") === true && rootBlocked.includes("failed"), rootBlocked);
  record("map: missing lexical data keeps composer disabled", await page.locator("#chatInput").isDisabled() && await page.locator("#sayBtn").isDisabled(), "composer and Say remain disabled");
  await page.unroute("**/ansci-data/**");

  // ---- map page: Full Chat button and successful lexical readiness ----
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#chatResourceStatus")?.dataset.state === "ready", null, { timeout: 30000 });
  const rootReady = await page.locator("#chatResourceStatus").textContent();
  record("map: root schematic loads required WordNet and FrameNet", rootReady?.includes("WordNet") === true && rootReady.includes("FrameNet"), rootReady);
  record("map: root composer enabled only after data load", await page.locator("#chatInput").isEnabled() && await page.locator("#sayBtn").isEnabled(), "composer enabled after ready status");
  const fullChat = page.locator('a[href="/chat/"]');
  record("map: Full Chat button present", (await fullChat.count()) === 1, `count=${await fullChat.count()} text="${(await fullChat.first().textContent())?.trim()}"`);
  await fullChat.first().click();
  await page.locator('[data-testid="lexical-status"][data-state="ready"]').waitFor({ timeout: 30000 });
  record("map: Full Chat links to /chat/", page.url() === base + "/chat/", page.url());

  // ---- chat page structure ----
  const tabCount = await page.locator('[role="tab"]').count();
  record("chat: opens with one session tab", tabCount === 1, `tabs=${tabCount}`);
  const geo = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)?.getBoundingClientRect();
    const tabbar = q(".tabbar"), settings = q(".settingsbar"), btn = q('[data-testid="new-session"]'), tabs = q(".tabs");
    return {
      tabbarY: tabbar?.y, settingsY: settings?.y, settingsBelowTabbar: !!settings && !!tabbar && settings.y >= tabbar.y + tabbar.height - 1,
      btnRight: btn ? Math.round(btn.x + btn.width) : -1, viewportW: innerWidth,
      btnSameRow: !!btn && !!tabs && Math.abs(btn.y + btn.height / 2 - (tabs.y + tabs.height / 2)) < 30,
      overflowX: document.documentElement.scrollWidth > innerWidth,
    };
  });
  record("chat: settings bar directly under tab bar", geo.settingsBelowTabbar, JSON.stringify(geo));
  record("chat: New session right-aligned on tab row", geo.btnRight > geo.viewportW - 40 && geo.btnSameRow, `btnRightEdge=${geo.btnRight} viewport=${geo.viewportW} sameRow=${geo.btnSameRow}`);
  record("chat: no horizontal overflow at 1600px", !geo.overflowX, `scrollWidth<=innerWidth`);
  const pressed = await page.locator(".tg-btn").evaluateAll((els) => els.map((e) => `${e.textContent.trim()}=${e.getAttribute("aria-pressed")}`));
  record("chat: three toggles, all off at open", pressed.join(",") === "Trace=false,Walk path=false,Declines=false", pressed.join(","));

  // ---- session 1: stateful pair ----
  await send("I have three apples.");
  await send("How many apples do I have?");
  const r1 = await replies();
  record("s1: apples noted", r1.some((t) => t.includes("Ok. Noted.")), JSON.stringify(r1));
  record("s1: how-many answered from its own record", r1.some((t) => t.includes("You have three apples.")), JSON.stringify(r1.slice(-1)));

  // ---- toggles reveal layers for existing turns ----
  await page.click('[data-testid="toggle-walk"]');
  const walks = await page.locator('[data-testid="walkpath"]').count();
  const walkText = await page.locator('[data-testid="walkpath"]').first().textContent();
  record("walk: one walkpath per exchange, completed at verbalizer", walks === 2 && !!walkText && walkText.includes("verbalizer"), `walks=${walks} first="${walkText?.slice(0, 90)}…"`);
  await page.click('[data-testid="toggle-trace"]');
  const traceCount = await page.locator('[data-testid="trace"]').count();
  await page.locator('[data-testid="trace"] summary').first().click();
  const traceText = await page.locator('[data-testid="trace"]').first().textContent();
  // NB: the apples turn carries no classifications in the browser build
  // (its trace shows parse, assessed-as and the quantity change instead) —
  // assert the fields this turn actually carries.
  record("trace: one trace per exchange, opens with parse + quantity change", traceCount === 2 && !!traceText && traceText.includes("parse:") && traceText.includes("quantity changes:"), `traces=${traceCount} text="${traceText?.slice(0, 110)}…"`);

  // ---- session 2: isolation + decline ----
  await page.click('[data-testid="new-session"]');
  const tabsNow = await page.locator('[role="tab"]').count();
  const emptyVisible = await page.locator('[data-testid="transcript"] .empty').count();
  record("s2: New session adds a tab and shows its own empty transcript", tabsNow === 2 && emptyVisible === 1, `tabs=${tabsNow} empty=${emptyVisible}`);
  await send("How many apples do I have?");
  const r2 = await replies();
  record("s2: fresh session does NOT know session 1's apples (isolation)", r2.some((t) => t.includes("haven't told me how many")), JSON.stringify(r2));
  await page.click('[data-testid="toggle-declines"]');
  const decline = page.locator('[data-testid="decline"]');
  const declineText = await decline.first().textContent();
  record("decline: box shows reason + located need", (await decline.count()) === 1 && !!declineText && declineText.includes("quantity ledger holds no tracked kind") && declineText.includes("located at:"), `"${declineText?.slice(0, 130)}…"`);
  const walk2 = page.locator('[data-testid="walkpath"]').first();
  const walk2Class = await walk2.getAttribute("class");
  const walk2Text = await walk2.textContent();
  record("decline: its walk is marked stopped and ends early (no verbalizer)", !!walk2Class && walk2Class.includes("stopped") && !!walk2Text && walk2Text.includes("stopped at") && !walk2Text.includes("verbalizer"), `class=${walk2Class} end="${walk2Text?.slice(-90)}"`);

  // ---- back to session 1: state intact ----
  await page.click('[data-testid="tab-Session 1"]');
  await send("How many apples do I have?");
  const r1b = await replies();
  const s1Answers = r1b.filter((t) => t.includes("You have three apples.")).length;
  record("s1: state intact after session 2 (answers three apples again)", s1Answers === 2, `three-apples replies in s1=${s1Answers}, lines=${r1b.length}`);

  await page.screenshot({ path: "/tmp/ansci-probe/chat-1600.png" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(300);
  const overflow1366 = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  record("chat: no horizontal overflow at 1366x768", !overflow1366, "");
  await page.screenshot({ path: "/tmp/ansci-probe/chat-1366.png" });
} catch (e) {
  record("probe completed without exception", false, String(e && e.message ? e.message : e));
} finally {
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
  server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
