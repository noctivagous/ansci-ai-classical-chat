import { useRef, useState } from "react";
import { newSession, type Session } from "../../../src/fork/session";
import { processTurn, type TurnResult } from "../../../src/fork/turn";
import { SCENARIOS } from "../../../src/fork/scenarios";
import { ELEMENT_COLORS } from "./GraphView";

interface Exchange {
  input: string;
  result?: TurnResult;
  error?: string;
}

function Trace({ ex }: { ex: Exchange }) {
  if (ex.error) return <p className="violations">parse failed: {ex.error}</p>;
  const t = ex.result!.trace;
  return (
    <details className="trace">
      <summary>how this reply was reached — turn trace</summary>
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
    </details>
  );
}

export default function Ask() {
  const sessionRef = useRef<Session>(newSession());
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState("");

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const result = processTurn(sessionRef.current, trimmed);
      setExchanges((xs) => [...xs, { input: trimmed, result }]);
    } catch (e) {
      setExchanges((xs) => [...xs, { input: trimmed, error: e instanceof Error ? e.message : String(e) }]);
    }
  };

  const runScenario = (name: string) => {
    const sc = SCENARIOS.find((s) => s.name === name)!;
    sessionRef.current = newSession();
    const fresh = newSession();
    sessionRef.current = fresh;
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
    sessionRef.current = newSession();
    setExchanges([]);
  };

  return (
    <section id="ask">
      <h2>Ask it something</h2>
      <p className="lede">
        A thin steering probe sits on top of the parser: it classifies what you say, follows the
        cycles, and answers from the derivation — or declines, with the reason in the trace.{" "}
        <strong>It is a demonstrator for the sentence layer, not a finished chat.</strong> Replies
        are a small hand-written set steered by the mechanism; the trace is the real exhibit.
      </p>
      <div className="chips">
        {SCENARIOS.map((s) => (
          <button key={s.name} className="chip" onClick={() => runScenario(s.name)}>
            {s.title}
          </button>
        ))}
        <button className="chip ghost" onClick={reset}>
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
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              send(draft);
              setDraft("");
            }
          }}
          placeholder="Say something to the probe…"
          aria-label="message to the probe"
        />
        <button
          className="primary"
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
