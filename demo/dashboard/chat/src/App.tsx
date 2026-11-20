import { useEffect, useRef, useState } from "react";
import { newSession, type FrameInput, type Session } from "../../../../src/ansci/session";
import { processTurn, type TurnResult } from "../../../../src/ansci/turn";
import { NEUTRAL_COMPOSITION } from "../../../../src/ansci/composition";
import type { PricingRecord } from "../../../../src/ansci/pricing";

/**
 * AnSci — Full Chat (/chat/).
 *
 * An IRC / chat-room style surface over the real fork turn loop
 * (src/ansci/turn.ts processTurn), running entirely in the browser
 * on the same static build as the schematic map page (/) and the
 * dashboard (/dashboard/). Nothing here is canned: every reply is
 * processTurn's own, against the active tab's own Session.
 *
 * Sessions (owner's spec): classic tabs at the top of the page,
 * one live Session per tab — newSession() each, never shared, so
 * a tab's registers (states, topics, quantities, the Social
 * Unit's conversation register) cannot bleed into another tab.
 * "New session" sits right-aligned on the tab row. Sessions open
 * the way the dashboard's Ask surface opens them (decision 3a):
 * the neutral disposition and an awareness frame from the
 * visitor's clock; no interlocutor store, so sessions live in
 * page memory only and are lost on reload.
 *
 * Settings bar (decision 2b): one row directly under the tab bar
 * with a toggle per kind of turn information — Trace (the full
 * turn trace), Walk path (the trace's mapPath, the nodes the turn
 * actually passed through), Declines (the decline reason and the
 * located gap it stopped at). Registers join this bar in a later
 * slice; the bar is a row of toggles so they can.
 *
 * Browser-build configuration, as on the other surfaces: the
 * engine's WordNet and FrameNet providers are disk-backed, are
 * stubbed out of the web build and disable themselves — the
 * settings bar says so.
 */

const ELEMENT_COLORS: Record<string, string> = {
  Wood: "#6aa84f",
  Fire: "#d95336",
  Earth: "#c9973f",
  Metal: "#8d99ae",
  Water: "#4a7fb5",
};

interface Exchange {
  input: string;
  result?: TurnResult;
  error?: string;
}

interface TabState {
  id: number;
  label: string;
  exchanges: Exchange[];
  draft: string;
}

/** The awareness frame from the visitor's own clock, in the
 *  shape the session accepts (the Ask surface's opening). */
function frameFromClock(): FrameInput {
  const d = new Date();
  return { month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours() };
}

function openSession(): Session {
  return newSession(NEUTRAL_COMPOSITION, frameFromClock());
}

function isStopped(ex: Exchange): boolean {
  if (ex.error) return true;
  const t = ex.result?.trace;
  return Boolean(t && (t.declineReason || t.parseSummary === "parse failed"));
}

function PricingLine({ label, p }: { label: string; p: PricingRecord }) {
  return (
    <p>
      <span className="caveat">{label}:</span> weakest tier on the path {p.weakestTier} · support{" "}
      {p.support.toFixed(2)} · ceiling {p.ceiling} → spoken level {p.level}
      {p.declined ? " (below the floor — declined)" : ""}
    </p>
  );
}

/** The walk: the turn trace's own mapPath, as an ordered node
 *  list. A stopped turn's final node is where the turn stopped —
 *  marked, and red, per the family rule that red is reserved for
 *  stopped turns only. */
function WalkPath({ ex }: { ex: Exchange }) {
  const t = ex.result?.trace;
  if (!t?.mapPath || t.mapPath.length === 0) return null;
  const stopped = isStopped(ex);
  const last = t.mapPath[t.mapPath.length - 1];
  return (
    <div className={stopped ? "walkpath stopped" : "walkpath"} data-testid="walkpath">
      <span className="wp-lbl">Walk</span>
      {t.mapPath.map((node, i) => (
        <span key={i}>
          {i > 0 && <span className="arrow">→</span>}
          <span className={stopped && i === t.mapPath!.length - 1 ? "node end-stop" : "node"}>{node}</span>
        </span>
      ))}
      <span className="wp-end">
        {stopped
          ? `— stopped at ${last}${t.declineReason ? `: ${t.declineReason}` : " — parse failed"}`
          : `— completed at ${last}`}
      </span>
    </div>
  );
}

/** The decline, located: the reason the turn stopped and the
 *  surviving needs it stopped at — the decline is AT those needs. */
function Decline({ ex }: { ex: Exchange }) {
  if (ex.error) {
    return (
      <div className="decline" data-testid="decline">
        <span className="d-lbl">Stopped</span> parse failed: {ex.error}
      </div>
    );
  }
  const t = ex.result?.trace;
  if (!t?.declineReason) return null;
  return (
    <div className="decline" data-testid="decline">
      <span className="d-lbl">Declined</span> {t.declineReason}
      {t.survivingNeeds && t.survivingNeeds.length > 0 && (
        <span className="d-need">
          located at: {t.survivingNeeds.map((n) => `${n.kind} — ${n.slot}`).join(" · ")}
        </span>
      )}
    </div>
  );
}

/** The full turn trace, in the dashboard trace's own terms. */
function Trace({ ex }: { ex: Exchange }) {
  if (ex.error) return null;
  const t = ex.result!.trace;
  return (
    <details className="trace" data-testid="trace">
      <summary>turn trace — how this reply was reached</summary>
      <p>
        <span className="caveat">session header:</span> disposition {t.disposition} · role {t.role}
        {t.frame && (
          <>
            {" "}· frame: season{" "}
            {t.frame.season
              ? `${t.frame.season.name} (${t.frame.season.element})`
              : (t.frame.seasonAbsentReason ?? "not determined")}{" "}
            · daypart {t.frame.daypart.name}
            {t.frame.daypart.element ? ` (${t.frame.daypart.element})` : ""}
          </>
        )}
      </p>
      <p>
        <span className="caveat">parse:</span> {t.parseSummary}
      </p>
      {t.semanticObjects && t.semanticObjects.length > 0 && (
        <p>
          <span className="caveat">assessed as:</span>{" "}
          {t.semanticObjects.map((o) => `${o.id} (${o.kind})`).join(" · ")}
        </p>
      )}
      {t.classifications.length > 0 && (
        <p>
          <span className="caveat">classifications used:</span>
          {t.classifications.map((c, i) => (
            <span key={i}>
              <span className="element-dot" style={{ background: ELEMENT_COLORS[c.element] }} />
              {c.concept} → {c.element} ({c.confidence.toFixed(2)}, {c.provenance})
            </span>
          ))}
        </p>
      )}
      {t.recognitions.length > 0 && (
        <p>
          <span className="caveat">recognitions (kind known, element unclassified):</span>{" "}
          {t.recognitions.map((r) => `${r.concept} (${r.category})`).join(" · ")}
        </p>
      )}
      {t.tokenResolutions.length > 0 && (
        <p>
          <span className="caveat">token resolutions:</span>{" "}
          {t.tokenResolutions
            .map(
              (r) =>
                `${r.surface} → ${r.outcome}${r.replacement.length ? ` (${r.replacement.join(" ")})` : ""} @${r.confidence.toFixed(2)} — ${r.rule}`,
            )
            .join(" · ")}
        </p>
      )}
      {t.resolutions.length > 0 && (
        <p>
          <span className="caveat">pronouns:</span>{" "}
          {t.resolutions.map((r) => `${r.pronoun} → ${r.resolvedTo}`).join(" · ")}
        </p>
      )}
      {t.cyclePath && (
        <p>
          <span className="caveat">steering cycle path:</span> {t.cyclePath}
        </p>
      )}
      {t.derivationPath && (
        <p>
          <span className="caveat">derivation:</span> {t.derivationPath}
        </p>
      )}
      {t.pricing && <PricingLine label="pricing — strength this reply may speak at" p={t.pricing} />}
      {t.answeredFromRecord && (
        <p>
          <span className="caveat">answered from the record:</span> the standing state —{" "}
          {t.answeredFromRecord.state.holder} is {t.answeredFromRecord.state.negated ? "not " : ""}
          {t.answeredFromRecord.state.lemma} (recorded at turn {t.answeredFromRecord.state.turn})
          {t.answeredFromRecord.supersessions.length > 0 &&
            `; behind it, the correction chain: ${t.answeredFromRecord.supersessions
              .map((d) => `${d.replaced.lemma} → ${d.replacing.lemma} (turn ${d.turn})`)
              .join(" · ")}`}
          . No derivation or pricing stands behind this reply — the record is its source.
        </p>
      )}
      {t.quantityAnswer && (
        <p>
          <span className="caveat">quantity ledger:</span> {t.quantityAnswer.holder} ·{" "}
          {t.quantityAnswer.kind} —{" "}
          {t.quantityAnswer.amount === null ? "a bounded unknown (some, never how many)" : t.quantityAnswer.amount}{" "}
          → “{t.quantityAnswer.rendered}”
        </p>
      )}
      {t.quantities && t.quantities.length > 0 && (
        <p>
          <span className="caveat">quantity changes:</span> {t.quantities.join(" · ")}
        </p>
      )}
      {t.steeringNote && (
        <p>
          <span className="caveat">steering note:</span> {t.steeringNote}
        </p>
      )}
      {t.declineReason && (
        <p>
          <span className="caveat">declined because:</span> {t.declineReason}
        </p>
      )}
      {t.wordingNotDerived && (
        <p>
          <span className="caveat">wording:</span> <strong>not derived</strong> — this reply is the
          steering probe's hand wording; no reply graph stands behind it.
        </p>
      )}
      {t.planNote && (
        <p>
          <span className="caveat">planner note:</span> {t.planNote}
        </p>
      )}
      {t.social && t.social.length > 0 && (
        <p>
          <span className="caveat">social unit:</span> {t.social.join(" · ")}
        </p>
      )}
      {t.coherence && t.coherence.length > 0 && (
        <p>
          <span className="caveat">coherence:</span> {t.coherence.join(" · ")}
        </p>
      )}
      {t.clarification && (
        <p>
          <span className="caveat">clarification:</span> “{t.clarification.lemma}” splits between rival
          derivations (
          {t.clarification.rivals
            .map((r) => `${r.element} via ${r.anchor}, support ${r.support.toFixed(2)}`)
            .join(" · ")}
          ); the sense pass proceeds with {t.clarification.baseline} — {t.clarification.ground}
        </p>
      )}
      {t.correction && (
        <p>
          <span className="caveat">correction — supersession ({t.correction.rule} rule):</span>{" "}
          {t.correction.replaced.lemma}
          {t.correction.replaced.negated ? " (negated)" : ""} (turn {t.correction.replaced.turn}) →{" "}
          {t.correction.replacing.lemma}
          {t.correction.replacing.negated ? " (negated)" : ""} (turn {t.correction.replacing.turn}) —{" "}
          {t.correction.ground}
        </p>
      )}
      {t.initiative && (
        <p>
          <span className="caveat">initiative ({t.initiative.shape}):</span> {t.initiative.ground} The
          appended {t.initiative.move} is: “{t.initiative.sentence}”
        </p>
      )}
      {t.replyGraph && (
        <>
          <p>
            <span className="caveat">reply graph — the meaning graph this reply was generated from:</span>
          </p>
          <pre>{t.replyGraph}</pre>
        </>
      )}
    </details>
  );
}

const EXAMPLES = ["Hello.", "I have three apples.", "How many apples do I have?", "I was furious."];

/** Copy text to the clipboard: the async clipboard API where it
 *  is available, the textarea + execCommand path elsewhere. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export default function App() {
  const sessionObjs = useRef(new Map<number, Session>());
  const nextId = useRef(1);
  const counter = useRef(0);

  const makeTab = (): TabState => {
    const id = nextId.current++;
    counter.current += 1;
    sessionObjs.current.set(id, openSession());
    return { id, label: `Session ${counter.current}`, exchanges: [], draft: "" };
  };

  const [tabs, setTabs] = useState<TabState[]>(() => [makeTab()]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const [showTrace, setShowTrace] = useState(false);
  const [showWalk, setShowWalk] = useState(false);
  const [showDeclines, setShowDeclines] = useState(false);
  const [copied, setCopied] = useState(false);

  /** Copy what is VISIBLE: the text is read from the rendered
   *  transcript node itself, not re-derived from the exchange
   *  data, so the settings-bar toggles decide what is copied at
   *  exactly the granularity the page renders — a turn's walk
   *  path, decline or trace is in the copy only while its toggle
   *  shows it, and a trace's body only while that turn's trace
   *  is expanded, because that is what is on screen. */
  const copyTranscript = async () => {
    if (!active || active.exchanges.length === 0) return;
    const text = transcriptRef.current?.innerText?.trim();
    if (!text) return;
    if (await copyToClipboard(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.id, active?.exchanges.length]);

  const newTab = () => {
    const tab = makeTab();
    setTabs((ts) => [...ts, tab]);
    setActiveId(tab.id);
  };

  const closeTab = (id: number) => {
    if (tabs.length <= 1) return;
    sessionObjs.current.delete(id);
    setTabs((ts) => ts.filter((t) => t.id !== id));
    if (active && active.id === id) setActiveId(null);
  };

  const send = (tabId: number, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const session = sessionObjs.current.get(tabId);
    if (!session) return;
    let exchange: Exchange;
    try {
      exchange = { input: trimmed, result: processTurn(session, trimmed) };
    } catch (e) {
      exchange = { input: trimmed, error: e instanceof Error ? e.message : String(e) };
    }
    setTabs((ts) =>
      ts.map((t) =>
        t.id === tabId ? { ...t, exchanges: [...t.exchanges, exchange], draft: "" } : t,
      ),
    );
  };

  const setDraft = (tabId: number, draft: string) => {
    setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, draft } : t)));
  };

  if (!active) return null;

  return (
    <div className="chat-shell">
      {/* ===== tab bar: sessions, New session right-aligned ===== */}
      <div className="tabbar">
        <span className="brand">
          AnSci <span className="thin">· Full Chat</span>
        </span>
        <div className="tabs" role="tablist" aria-label="Chat sessions">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === active.id}
              className={t.id === active.id ? "tab on" : "tab"}
              onClick={() => setActiveId(t.id)}
              data-testid={`tab-${t.label}`}
            >
              {t.label}
              {t.exchanges.length > 0 && <span className="count">{t.exchanges.length}</span>}
              <span
                className="close"
                role="button"
                aria-label={`Close ${t.label}`}
                title={tabs.length <= 1 ? "The last session cannot be closed" : `Close ${t.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.id);
                }}
                data-testid={`close-${t.label}`}
              >
                ×
              </span>
            </button>
          ))}
        </div>
        <button className="new-session" onClick={newTab} data-testid="new-session">
          + New session
        </button>
      </div>

      {/* ===== settings bar: one row of information toggles ===== */}
      <div className="settingsbar">
        <span className="lbl">Show</span>
        <div className="toggle-group" role="group" aria-label="Information to show per turn">
          <button
            className={showTrace ? "tg-btn on" : "tg-btn"}
            aria-pressed={showTrace}
            onClick={() => setShowTrace((v) => !v)}
            data-testid="toggle-trace"
          >
            Trace
          </button>
          <button
            className={showWalk ? "tg-btn on" : "tg-btn"}
            aria-pressed={showWalk}
            onClick={() => setShowWalk((v) => !v)}
            data-testid="toggle-walk"
          >
            Walk path
          </button>
          <button
            className={showDeclines ? "tg-btn on" : "tg-btn"}
            aria-pressed={showDeclines}
            onClick={() => setShowDeclines((v) => !v)}
            data-testid="toggle-declines"
          >
            Declines
          </button>
        </div>
        <span className="spacer" />
        <button
          className="copy-btn"
          onClick={copyTranscript}
          disabled={active.exchanges.length === 0}
          title={
            active.exchanges.length === 0
              ? "Nothing to copy yet — this session has no turns"
              : "Copy what this session's transcript currently shows to the clipboard"
          }
          data-testid="copy-transcript"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <span className="note">browser build — WordNet &amp; FrameNet providers off</span>
        <a className="navlink" href="../">
          ← Map
        </a>
        <a className="navlink" href="../dashboard/">
          Dashboard
        </a>
      </div>

      {/* ===== transcript ===== */}
      <div className="transcript" ref={transcriptRef} data-testid="transcript">
        {active.exchanges.length === 0 && (
          <div className="empty">
            <p>
              Nothing said in {active.label} yet. This session is live — every sentence runs
              through the turn loop, the session keeps what was established, and outside the
              graph's range it declines, with the ground named. Flip on <strong>Trace</strong>,{" "}
              <strong>Walk path</strong> or <strong>Declines</strong> above to see what a turn
              carried with it.
            </p>
            <div className="examples">
              {EXAMPLES.map((s) => (
                <button key={s} className="example-chip" onClick={() => send(active.id, s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {active.exchanges.map((ex, i) => (
          <div className="exchange" key={i}>
            <p className="line">
              <span className="turno">#{i + 1}</span>
              <span className="nick visitor">&lt;visitor&gt;</span> {ex.input}
            </p>
            {ex.result && (
              <p className={isStopped(ex) ? "line stopped" : "line"}>
                <span className="turno">#{i + 1}</span>
                <span className="nick system">&lt;ansci&gt;</span> {ex.result.reply}
              </p>
            )}
            {ex.error && <p className="error-line">parse failed: {ex.error}</p>}
            {showWalk && <WalkPath ex={ex} />}
            {showDeclines && <Decline ex={ex} />}
            {showTrace && <Trace ex={ex} />}
          </div>
        ))}
      </div>

      {/* ===== composer ===== */}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(active.id, active.draft);
        }}
      >
        <span className="prompt">visitor&gt;</span>
        <input
          value={active.draft}
          onChange={(e) => setDraft(active.id, e.target.value)}
          placeholder="Say something…"
          aria-label="message"
          data-testid="composer-input"
        />
        <button className="send" type="submit" data-testid="composer-send">
          Send
        </button>
      </form>
    </div>
  );
}
