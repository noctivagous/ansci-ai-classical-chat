import { useEffect, useRef, useState } from "react";
import { newSession, type FrameInput, type Session } from "../../../src/ansci/session";
import { processTurn, type TurnResult } from "../../../src/ansci/turn";
import { SCENARIOS } from "../../../src/ansci/scenarios";
import { NEUTRAL_COMPOSITION, type Composition } from "../../../src/ansci/composition";
import { WATER_DISPOSITION, WOOD_DISPOSITION } from "../../../src/ansci/disposition";
import type { PricingRecord } from "../../../src/ansci/pricing";
import { initializeBrowserLexicalData, type BrowserLexicalReadiness } from "./browser-lexical-data";
import { ELEMENT_COLORS } from "./GraphView";

interface Exchange {
  input: string;
  result?: TurnResult;
  error?: string;
}

/**
 * The programme's named compositions (reply-planning design
 * note §9.1, T-R4 §1), offered by the switcher below. The
 * compositions themselves are imported from the engine —
 * NEUTRAL_COMPOSITION, WOOD_DISPOSITION, WATER_DISPOSITION —
 * never retyped here; only their display names and declared
 * postures are local, and the postures are T-R4's declared
 * ones.
 */
const DISPOSITIONS: { key: string; name: string; composition: Composition; posture: string }[] = [
  {
    key: "neutral",
    name: "Neutral",
    composition: NEUTRAL_COMPOSITION,
    posture: "predominant Earth, no other ranks — the declared default; its declared effect is none.",
  },
  {
    key: "wood",
    name: "Wood-predominant",
    composition: WOOD_DISPOSITION,
    posture:
      "predominant Wood, secondary Fire, trace Earth — steering prefers the generating direction first; a composed reply speaks its full set.",
  },
  {
    key: "water",
    name: "Water-predominant",
    composition: WATER_DISPOSITION,
    posture:
      "predominant Water, secondary Metal, trace Fire — steering prefers addressing the restrainer first; a composed reply speaks its lead and holds the rest, recorded.",
  },
];

/** The awareness frame (§8.1) from the visitor's own clock, in
 *  the shell input shape the session accepts. */
function frameFromClock(): FrameInput {
  const d = new Date();
  return { month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours() };
}

/** Open a session the way this shell does: the chosen
 *  disposition, the frame from the clock, and the engine's
 *  neutral role (§8.1's slot — no behaviour reads it yet). */
function openSession(composition: Composition): Session {
  return newSession(composition, frameFromClock());
}

function frameSummary(session: Session): string {
  const f = session.frame;
  if (!f) return "no frame supplied";
  const season = f.season ? `${f.season.name} (${f.season.element})` : "no season determined";
  const daypart = `${f.daypart.name}${f.daypart.element ? ` (${f.daypart.element})` : ""}${f.daypart.polarity ? `, ${f.daypart.polarity}` : ""}`;
  return `season ${season} · daypart ${daypart} — classified from your clock at the session's opening`;
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

function Trace({ ex }: { ex: Exchange }) {
  if (ex.error) return <p className="violations">parse failed: {ex.error}</p>;
  const t = ex.result!.trace;
  return (
    <details className="trace">
      <summary>how this reply was reached — turn trace</summary>
      <p>
        <span className="caveat">session header:</span> disposition {t.disposition} · role {t.role}
        {t.frame && (
          <>
            {" "}
            · frame: season{" "}
            {t.frame.season ? (
              <>
                {t.frame.season.name} ({t.frame.season.element}, {t.frame.season.origin.tier})
              </>
            ) : (
              (t.frame.seasonAbsentReason ?? "not determined")
            )}{" "}
            · daypart {t.frame.daypart.name}
            {t.frame.daypart.element && (
              <>
                {" "}
                ({t.frame.daypart.element}, {t.frame.daypart.origin?.tier})
              </>
            )}
            {t.frame.daypart.polarity && <>, polarity {t.frame.daypart.polarity}</>}
            {t.frame.daypart.unclassifiedReason && <> — {t.frame.daypart.unclassifiedReason}</>}
          </>
        )}
      </p>
      <p>
        <span className="caveat">parse:</span> {t.parseSummary}
      </p>
      {t.classifications.length > 0 && (
        <p>
          <span className="caveat">classifications used:</span>{" "}
          {t.classifications.map((c, i) => (
            <span key={i}>
              <span className="element-dot" style={{ background: ELEMENT_COLORS[c.element] }} />
              {c.concept} → {c.element} ({c.confidence.toFixed(2)}, {c.provenance}){" "}
            </span>
          ))}
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
      {t.generatingMargin !== undefined && (
        <p>
          <span className="caveat">steering basis:</span>{" "}
          {t.generatingMargin
            ? "a generating relation selected this branch — the term whose both-directions counting is the sense layer's recorded flaw, flagged here for audit"
            : "a controlling relation selected this branch"}
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
          steering probe's hand wording; no reply graph stands behind it, and no derivation or
          pricing record above should be read as the wording's source.
        </p>
      )}
      {t.planNote && (
        <p>
          <span className="caveat">planner note:</span> {t.planNote}
        </p>
      )}
      {t.replyGraph && (
        <>
          <p>
            <span className="caveat">reply graph — the meaning graph this reply was generated from:</span>
          </p>
          <pre className="trace-graph">{t.replyGraph}</pre>
        </>
      )}
      {t.composition && (
        <>
          <p>
            <span className="caveat">composition of conclusions:</span> spoken in {t.composition.activeOrder}{" "}
            order
            {t.composition.newestState &&
              ` · relation order taken against the newest state (${t.composition.newestState.lemma}, ${t.composition.newestState.element})`}
          </p>
          <p>
            <span className="caveat">both orderings:</span> by support —{" "}
            {t.composition.supportOrder.join(" · ") || "—"}; by relation to the newest state —{" "}
            {t.composition.relationOrder.join(" · ") || "—"}
          </p>
          {t.composition.members.map((m, i) => (
            <div key={i}>
              <p>
                <span className="caveat">member — {m.quality}:</span> {m.derivationPath}
              </p>
              <PricingLine label={`pricing — ${m.quality}`} p={m.pricing} />
            </div>
          ))}
          {t.composition.dropped.map((d, i) => (
            <p key={`d${i}`}>
              <span className="caveat">member dropped — {d.quality}:</span> {d.ground} (weakest tier{" "}
              {d.pricing.weakestTier}, support {d.pricing.support.toFixed(2)}, level {d.pricing.level})
            </p>
          ))}
          {t.composition.held?.map((h, i) => (
            <p key={`h${i}`}>
              <span className="caveat">member held by the disposition's length behaviour — {h.quality}:</span>{" "}
              {h.ground} (weakest tier {h.pricing.weakestTier}, support {h.pricing.support.toFixed(2)},
              level {h.pricing.level}) — grounded and priced, not spoken
            </p>
          ))}
        </>
      )}
      {t.dispositionBias?.map((b, i) => (
        <p key={i}>
          <span className="caveat">disposition bias · {b.channel}:</span>
          {b.context ? ` ${b.context} —` : ""} [{b.before.join(" · ")}] → [{b.after.join(" · ")}] —{" "}
          {b.rule}
        </p>
      ))}
      {t.gapQuestion && (
        <p>
          <span className="caveat">gap question:</span> the verb “{t.gapQuestion.verb}” leaves its{" "}
          {t.gapQuestion.role} role unfilled — {t.gapQuestion.ground}
        </p>
      )}
      {t.clarification && (
        <p>
          <span className="caveat">clarification:</span> “{t.clarification.lemma}” splits between rival
          derivations ({t.clarification.rivals.map((r) => `${r.element} via ${r.anchor}, support ${r.support.toFixed(2)}`).join(" · ")}); the sense
          pass proceeds with {t.clarification.baseline} — {t.clarification.ground}
        </p>
      )}
      {t.cohesion && (
        <p>
          <span className="caveat">cohesion:</span> relation {t.cohesion.relation}, marker “
          {t.cohesion.marker}” — earned by the record: {t.cohesion.ground}
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
          {t.correction.note && <> Note: {t.correction.note}</>}
        </p>
      )}
      {t.addressedState && (
        <p>
          <span className="caveat">steering addressed:</span> the standing state {t.addressedState.lemma}{" "}
          (held by {t.addressedState.holder}, from turn {t.addressedState.turn}) — the state this
          turn's restrainer steering took up.
        </p>
      )}
      {t.personPresented && (
        <p>
          <span className="caveat">your turn:</span> presented a {t.personPresented} of its own —
          initiative is barred on such a turn.
        </p>
      )}
      {t.initiative && (
        <>
          <p>
            <span className="caveat">initiative ({t.initiative.shape}):</span> {t.initiative.ground} The
            appended {t.initiative.move} is: “{t.initiative.sentence}”
          </p>
          {t.initiative.pricing && <PricingLine label="pricing — initiative predication" p={t.initiative.pricing} />}
        </>
      )}
    </details>
  );
}

export default function Ask() {
  const [lexicalState, setLexicalState] = useState<
    | { status: "loading"; reason: string }
    | { status: "ready"; data: BrowserLexicalReadiness }
    | { status: "error"; reason: string }
  >({ status: "loading", reason: "Loading required WordNet and FrameNet data…" });

  useEffect(() => {
    let mounted = true;
    initializeBrowserLexicalData().then(
      (data) => { if (mounted) setLexicalState({ status: "ready", data }); },
      (error: unknown) => {
        if (mounted) setLexicalState({ status: "error", reason: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => { mounted = false; };
  }, []);

  const [dispKey, setDispKey] = useState("neutral");
  const sessionRef = useRef<Session | null>(null);
  if (sessionRef.current === null) sessionRef.current = openSession(NEUTRAL_COMPOSITION);
  const [sessionFacts, setSessionFacts] = useState(() => frameSummary(sessionRef.current!));
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState("");

  const startSession = (composition: Composition) => {
    const s = openSession(composition);
    sessionRef.current = s;
    setSessionFacts(frameSummary(s));
    setExchanges([]);
    return s;
  };

  const chooseDisposition = (key: string) => {
    if (key === dispKey) return;
    setDispKey(key);
    startSession(DISPOSITIONS.find((d) => d.key === key)!.composition);
  };

  const send = (text: string) => {
    if (lexicalState.status !== "ready") return;
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const result = processTurn(sessionRef.current!, trimmed);
      setExchanges((xs) => [...xs, { input: trimmed, result }]);
    } catch (e) {
      setExchanges((xs) => [...xs, { input: trimmed, error: e instanceof Error ? e.message : String(e) }]);
    }
  };

  const runScenario = (name: string) => {
    if (lexicalState.status !== "ready") return;
    const sc = SCENARIOS.find((s) => s.name === name)!;
    const fresh = startSession(DISPOSITIONS.find((d) => d.key === dispKey)!.composition);
    const out: Exchange[] = [];
    for (const turn of sc.turns) {
      try {
        out.push({ input: turn, result: processTurn(fresh, turn) });
      } catch (e) {
        out.push({ input: turn, error: e instanceof Error ? e.message : String(e) });
      }
    }
    setExchanges(out);
  };

  const reset = () => {
    startSession(DISPOSITIONS.find((d) => d.key === dispKey)!.composition);
  };

  const active = DISPOSITIONS.find((d) => d.key === dispKey)!;

  return (
    <section id="ask">
      <h2>Ask it something</h2>
      <p className="lede">
        The chat now runs the reply planner: what you say is parsed into a meaning graph, the
        session keeps what was established, and each reply is <em>planned</em> from the
        derivations that follow — a meaning graph built for the reply, priced by the standing of
        what it rests on, and generated from that graph. Where no derivation backs a turn, the
        older steering wording still speaks and the trace says so plainly.{" "}
        <strong>It is a demonstrator for the sentence layer, not a finished chat</strong> — it
        knows this conversation, not you, and its range is the graph's range: outside that it
        declines, with the ground named in the trace.
      </p>
      <p className="caveat">
        <strong data-testid="lexical-status" data-state={lexicalState.status} role="status" aria-live="polite">
          {lexicalState.status === "loading"
            ? lexicalState.reason
            : lexicalState.status === "error"
              ? `Chat disabled: required WordNet / FrameNet data failed to load (${lexicalState.reason}).`
              : `Required resources ready: WordNet ${lexicalState.data.wordnet.edition} (${lexicalState.data.wordnet.synsets.toLocaleString()} synsets) and FrameNet ${lexicalState.data.framenet.edition} (${lexicalState.data.framenet.frames.toLocaleString()} frames).`}
        </strong>
      </p>
      <div className="chips" role="group" aria-label="disposition">
        {DISPOSITIONS.map((d) => (
          <button
            key={d.key}
            disabled={lexicalState.status !== "ready"}
            className="chip"
            aria-pressed={d.key === dispKey}
            style={d.key === dispKey ? { borderColor: "var(--accent)", fontWeight: 700 } : undefined}
            onClick={() => chooseDisposition(d.key)}
          >
            {d.name}
          </button>
        ))}
      </div>
      <p className="caveat">
        <strong>Architecture demonstration — the session's disposition.</strong> {active.posture}{" "}
        A disposition is setup, fixed when a session opens: the same conversation under a
        different composition proceeds differently — different steering choices, different
        qualification — without concluding differently. Changing it starts a new conversation
        (the one above is cleared). Current session: {sessionFacts}.
      </p>
      <div className="chips">
        {SCENARIOS.map((s) => (
          <button key={s.name} className="chip" disabled={lexicalState.status !== "ready"} onClick={() => runScenario(s.name)}>
            {s.title}
          </button>
        ))}
        <button className="chip ghost" disabled={lexicalState.status !== "ready"} onClick={reset}>
          reset conversation
        </button>
      </div>
      <div className="transcript">
        {exchanges.length === 0 && (
          <p className="caveat">Run a scenario above, or type below — try “I was furious.” then “I shouted at him.”</p>
        )}
        {exchanges.map((ex, i) => (
          <div key={i} className="exchange">
            <p className="user-line">
              <span className="who">you</span> {ex.input}
            </p>
            {ex.result && (
              <p className="bot-line">
                <span className="who">ansci</span> {ex.result.reply}
              </p>
            )}
            <Trace ex={ex} />
          </div>
        ))}
      </div>
      <div className="lab-input">
        <input
          value={draft}
          disabled={lexicalState.status !== "ready"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              send(draft);
              setDraft("");
            }
          }}
          placeholder="Say something…"
          aria-label="message"
        />
        <button
          className="primary"
          disabled={lexicalState.status !== "ready"}
          onClick={() => {
            send(draft);
            setDraft("");
          }}
        >
          Send
        </button>
      </div>
    </section>
  );
}
