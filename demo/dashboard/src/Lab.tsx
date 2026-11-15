import { useMemo, useState } from "react";
import { parse } from "../../../src/fork/parse";
import { generate } from "../../../src/fork/generate";
import { checkSentence } from "../../../src/fork/check";
import { buildForkGraph, deriveSentence, type Derivation } from "../../../src/fork/join";
import { applySenseSelection, type SenseDecision } from "../../../src/fork/sense";
import { enableWordnetLexicon, wordnetAvailable } from "../../../src/fork/wordnet-lex";
import type { ParsedSentence } from "../../../src/fork/sentence";
import GraphView, { ELEMENT_COLORS } from "./GraphView";

enableWordnetLexicon(true);

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
  { text: "我吃了饭。", note: "aspect particle as clause scope" },
  { text: "你买什么？", note: "wh-in-situ: the question word stays in its slot" },
  { text: "他跑得很快。", note: "degree complement carrying the main content" },
  { text: "今天星期一。", note: "verbless nominal predication" },
  { text: "他买三书。", note: "must be flagged: missing classifier" },
  { text: "饭被吃了。", note: "agentless passive — slot suppressed, not filled" },
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
  const lang = /[\u4e00-\u9fff]/.test(input) ? "zh" : "en";
  try {
    const parsed = parse(input, lang as "en" | "zh");
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
  const [result, setResult] = useState<LabResult>(() => run("I was furious.", buildForkGraph()));
  const wn = wordnetAvailable();

  const go = (t: string) => {
    setText(t);
    setResult(run(t, graph));
  };

  return (
    <section id="lab">
      <h2>The live lab</h2>
      <p className="lede">
        This is the real engine, running in your browser — the same parser, checker, generator and
        derivation code the evaluations measure. Type a sentence (English or Chinese) or pick an
        example. Nothing here is canned.
      </p>
      <p className="provider-status">
        Engine status: hand lexicon + classification table <strong>live</strong> · WordNet provider{" "}
        <strong>{wn ? "live" : "off in the web build"}</strong>
        {!wn && " (its 20 MB extract is not bundled — derived classifications and live sense selection need the local build)"}{" "}
        · FrameNet signatures <strong>off in the web build</strong>
      </p>
      <div className="chips">
        {EXAMPLES.map((ex) => (
          <button key={ex.text} className="chip" onClick={() => go(ex.text)} title={ex.note}>
            {ex.text}
          </button>
        ))}
      </div>
      <div className="lab-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go(text)}
          placeholder="Type a sentence — e.g. The wind blows from the east."
          aria-label="sentence to parse"
        />
        <button className="primary" onClick={() => go(text)}>
          Parse it
        </button>
      </div>

      {result.error && (
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

      {result.parsed && (
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
                {!wn && " (and the WordNet provider is off in this build, so no derived senses are in play)"}.
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
