import { useEffect, useMemo, useState } from "react";
import { parse } from "../../../src/ansci/parse";
import { generate } from "../../../src/ansci/generate";
import { checkSentence } from "../../../src/ansci/check";
import { buildForkGraph, deriveSentence, type Derivation } from "../../../src/ansci/join";
import { applySenseSelection, type SenseDecision } from "../../../src/ansci/sense";
import { initializeBrowserLexicalData, type BrowserLexicalReadiness } from "./browser-lexical-data";
import type { ParsedSentence } from "../../../src/ansci/sentence";
import GraphView, { ELEMENT_COLORS } from "./GraphView";

const EXAMPLES: { text: string; note: string }[] = [
  { text: "The dog bit the man.", note: "canonical clause" },
  { text: "The man was bitten by the dog.", note: "passive — same meaning graph" },
  { text: "I was furious.", note: "two addresses: Fire syntax, Wood in the net" },
  { text: "She didn't arrive.", note: "negation on a Metal carrier" },
  { text: "She didn't arrived.", note: "must be flagged: tense twice" },
  { text: "My bananas have gone all brown.", note: "change of state, generating arc" },
  { text: "If I were king, I would abdicate.", note: "conditional + subjunctive" },
  { text: "Today is Monday.", note: "nominal predication" },
  { text: "Who is Sarah?", note: "a query over predicated-as" },
  { text: "What's in it?", note: "a containment query — a different record" },
  { text: "What about coffee?", note: "a discourse act, not a broken sentence" },
  { text: "Why is the garden flooded?", note: "inverted question, recovered subject" },
  { text: "Tell me about winter.", note: "imperative" },
  { text: "Winter is coming.", note: "progressive, canonical round trip" },
  { text: "It is raining.", note: "weather predication — no Earth participant" },
];

interface LabResult {
  input: string;
  parsed?: ParsedSentence;
  regenerated?: string;
  genError?: string;
  violations: string[];
  derivations?: Map<string, Derivation>;
  sense: SenseDecision[];
  error?: string;
}

function run(input: string, graph: ReturnType<typeof buildForkGraph>): LabResult {
  if (/[\u3400-\u9fff\uf900-\ufaff]/.test(input)) {
    return {
      input,
      violations: [],
      sense: [],
      error: "This project currently supports English parsing and output only.",
    };
  }
  try {
    const parsed = parse(input, "en");
    const sense = applySenseSelection(parsed);
    let regenerated: string | undefined;
    let genError: string | undefined;
    try {
      regenerated = generate(parsed);
    } catch (e) {
      genError = e instanceof Error ? e.message : String(e);
    }
    return {
      input,
      parsed,
      regenerated,
      genError,
      violations: checkSentence(parsed).map((v) => `${v.name} — ${v.message}`),
      derivations: deriveSentence(graph, parsed),
      sense,
    };
  } catch (e) {
    return { input, violations: [], sense: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export default function Lab() {
  const graph = useMemo(() => buildForkGraph(), []);
  const [text, setText] = useState("I was furious.");
  const [result, setResult] = useState<LabResult | null>(null);
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

  const go = (t: string) => {
    setText(t);
    if (lexicalState.status !== "ready") return;
    setResult(run(t, graph));
  };

  return (
    <section id="lab">
      <h2>The live lab</h2>
      <p className="lede">
        This is the real engine, running in your browser — the same parser, checker, generator and
        derivation code the evaluations measure. Type an English sentence or pick an example.
        English is the project's only language acceptance scope; older Chinese results are kept
        as historical evidence.
      </p>
      <p className="provider-status" role="status" aria-live="polite" data-testid="lexical-status" data-state={lexicalState.status}>
        {lexicalState.status === "loading"
          ? lexicalState.reason
          : lexicalState.status === "error"
            ? `Analysis disabled: required WordNet / FrameNet data failed to load (${lexicalState.reason}).`
            : `Required resources ready: WordNet ${lexicalState.data.wordnet.edition} and FrameNet ${lexicalState.data.framenet.edition}.`}
      </p>
      <div className="chips">
        {EXAMPLES.map((ex) => (
          <button key={ex.text} className="chip" disabled={lexicalState.status !== "ready"} onClick={() => go(ex.text)} title={ex.note}>
            {ex.text}
          </button>
        ))}
      </div>
      <div className="lab-input">
        <input
          value={text}
          disabled={lexicalState.status !== "ready"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go(text)}
          placeholder="Type a sentence — e.g. The wind blows from the east."
          aria-label="sentence to parse"
        />
        <button className="primary" disabled={lexicalState.status !== "ready"} onClick={() => go(text)}>
          Parse it
        </button>
      </div>

      {result?.error && (
        <div className="panel failure-panel">
          <h3>It cannot parse this — and says so</h3>
          <p>
            <code>{result.input}</code> → <span className="mono">{result.error}</span>
          </p>
          <p className="caveat">
            A parse failure is a first-class outcome here: the system abstains rather than guessing.
            Some failures are known and catalogued on the failure wall below.
          </p>
        </div>
      )}

      {result?.parsed && (
        <div className="lab-results">
          <div className="panel">
            <h3>Round trip</h3>
            <p className="big-line">
              {result.regenerated ?? <span className="mono">generation failed: {result.genError}</span>}
            </p>
            <p>
              {result.regenerated && result.regenerated.trim() === result.input.trim() ? (
                <span className="badge ok">exact round trip</span>
              ) : (
                <span className="badge neutral">canonicalised — wording normalised, meaning kept (check the graph)</span>
              )}
              {result.parsed.query && (
                <span className="badge info">
                  query: {result.parsed.query.relation} · expects {result.parsed.query.expectedType}
                </span>
              )}
              {result.parsed.discourseAct && (
                <span className="badge info">discourse act: {result.parsed.discourseAct}</span>
              )}
            </p>
            <h4>Checker</h4>
            {result.violations.length === 0 ? (
              <p className="ok-text">No violations.</p>
            ) : (
              <ul className="violations">
                {result.violations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            )}
            <h4>Sense selection</h4>
            {result.sense.length === 0 ? (
              <p className="caveat">
                No word in this sentence has competing anchored senses
                .
              </p>
            ) : (
              <ul>
                {result.sense.map((d, i) => (
                  <li key={i}>
                    <strong>{d.lemma}</strong>: climb alone says {d.baseline}; sentence coherence{" "}
                    {d.overturned ? (
                      <>
                        overturns it to <strong>{d.chosen}</strong>
                      </>
                    ) : (
                      <>keeps {d.chosen}</>
                    )}{" "}
                    <span className="caveat">(context: {d.context.join(", ") || "none"})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="panel">
            <h3>Meaning graph</h3>
            <GraphView parsed={result.parsed} />
          </div>
          <div className="panel">
            <h3>How it reaches beyond the sentence — derivations</h3>
            <p className="caveat">
              Each classified word is placed in the ontology; the net then yields correspondence
              conclusions, each with its derivation path. This is the inspection view: nothing is
              concluded without a path you can read.
            </p>
            {result.parsed.meaning.nodes.map((n) => {
              const d = result.derivations?.get(n.id);
              if (!d?.classification) return null;
              return (
                <details key={n.id} className="derivation">
                  <summary>
                    <span
                      className="element-dot"
                      style={{ background: ELEMENT_COLORS[d.classification.element] }}
                    />
                    <strong>{n.lemma}</strong> → {d.classification.element} · confidence{" "}
                    {d.classification.confidence.toFixed(2)} · {d.classification.provenance}
                    {d.gated && " · below the confidence gate — no conclusions drawn"}
                  </summary>
                  {d.conclusions.length > 0 && (
                    <ul>
                      {d.conclusions.slice(0, 8).map((c, i) => (
                        <li key={i}>
                          {c.category}: <strong>{c.label}</strong>{" "}
                          <span className="path">{c.path}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {d.conflicts.map((c, i) => (
                    <p key={i} className="violations">
                      conflict: {c.message}
                    </p>
                  ))}
                </details>
              );
            })}
            {![...result.derivations!.values()].some((d) => d.classification) && (
              <p className="caveat">No word in this sentence carries a classification in the net yet.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
