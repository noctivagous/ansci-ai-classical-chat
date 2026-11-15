import { useMemo } from "react";
import { CAPABILITIES, EVIDENCE_AS_OF } from "./evidence";
import Lab from "./Lab";
import Ask from "./Ask";
import { parse } from "../../../src/fork/parse";
import { generate } from "../../../src/fork/generate";

function Bars({ bars }: { bars: { label: string; value: number; max: number }[] }) {
  return (
    <div className="bars">
      {bars.map((b) => (
        <div key={b.label} className="bar-row">
          <span className="bar-label">{b.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(100 * b.value) / b.max}%` }} />
          </span>
          <span className="bar-value">
            {b.value}/{b.max}
          </span>
        </div>
      ))}
    </div>
  );
}

function LiveHasCold() {
  const outcome = useMemo(() => {
    try {
      parse("She has a cold.", "en");
      return "parsed (this failure has been fixed since the catalogue was written)";
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }, []);
  return (
    <p className="live-outcome">
      Live check, just now: <code>She has a cold.</code> → <span className="mono">{outcome}</span>
    </p>
  );
}

function LiveF1() {
  const outcome = useMemo(() => {
    try {
      const p = parse("他不去学校。", "zh");
      const negated = p.meaning.nodes.some((n) => n.states?.negated);
      return { regenerated: generate(p), negated };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, []);
  return (
    <p className="live-outcome">
      Live check, just now: <code>他不去学校。</code> (“He does not go to school”) regenerates as{" "}
      <code>{outcome.regenerated ?? outcome.error}</code>
      {outcome.regenerated && (
        <>
          {" "}
          — negation present in the parse: <strong>{outcome.negated ? "yes" : "no"}</strong>. The
          sentence comes back affirmative and the checker says nothing.
        </>
      )}
    </p>
  );
}

const RECORDED_FAILURES: { title: string; body: string; status: string }[] = [
  {
    title: "Sense selection can be talked out of the right answer (X1)",
    body: "In the sealed sense set, “The stock simmered in the pot” was overturned from broth (Water, correct) to bloodline (Fire): the pot's own Earth classification supported the wrong sense through a generating relation. The cycles amplify whatever classifications they touch — including wrong ones. Direction-sensitive support is the recorded fix direction; it was deliberately NOT retuned after seeing the sealed set.",
    status: "recorded in docs/fork/sense-challenge.md · mechanism v2 not yet built",
  },
  {
    title: "The elemental valency prior cannot yet be tested",
    body: "The programme's sharpest open question — does a verb's element predict its argument shape better than FrameNet alone? — is unrunnable: derived verbs carry no semantic element, because hypernym climbs anchor nouns and adjectives but not verbs. Until verbs are classified, the prior is adopted nowhere. Claims are sized to evidence here: an untestable mechanism earns nothing.",
    status: "open · route is the classification pilot / coverage work",
  },
  {
    title: "H3a vs H3b — the sense rivalry — is unsettled",
    body: "Two preregistered accounts of sense priority (Water-first vs Earth-restraint) make different predictions in conflicted sentences. The deciding instrument is a human experiment — free interpretation before forced choice, dozens of judges, a Chinese arm with 60 native speakers. It cannot be supplied inside this project loop, so the rivalry stays honestly open.",
    status: "preregistered 2026-11-15 · awaiting external judges",
  },
  {
    title: "Anchor coverage is the binding constraint",
    body: "Of 8,099 polysemous words, only 28 have anchored senses in more than one element — and several anchors are reached by wayward paths (rock arrives at Earth via “sweet”; snap via “cake”). Better disambiguation cannot fix thin, noisy anchors; classification coverage and path quality are the long pole.",
    status: "measured in the stage-4 census · coverage work is next on that side",
  },
  {
    title: "Review does not scale yet",
    body: "At ×100 classification density the review queue is 1,047 items — beyond hand review — and the automatic precision proxy degrades to 0.751. Whether the proxy or the derivations are wrong is undecided until the judged benchmark (WP2) gets independent human judges.",
    status: "open · triage protocol ratified, judges not yet available",
  },
];

export default function App() {
  return (
    <div className="page">
      <header>
        <p className="kicker">AnSci · the fork</p>
        <h1>What can it do so far?</h1>
        <p className="intro">
          AnSci is an attempt to build a working mind out of classical machinery: a knowledge graph
          of ancient Chinese science — the body, the world and the heavens, interrelated through the
          Five Phases (Wuxing, 五行） — joined to a sentence layer that parses English and Chinese{" "}
          <em>by means of</em> that same system. Classify a thing in the ontology, and its neighbours
          start telling you about it: that is the thesis, and it is being tested, not assumed.
        </p>
        <p className="intro">
          This page is the project's progress exhibit, and it is deliberately{" "}
          <strong>not a percentage</strong>. A single number would pretend the remaining work is
          uniform and that every score measures the same thing. Instead there are three ledgers —
          mechanical feature preservation, externally judged correctness, and evidence-qualified
          coverage — and a gain in one is never presented as a gain in another. Below: the measured
          capabilities with their caveats attached, the engine itself to try, the traces behind its
          answers, and a wall of named failures.
        </p>
        <p className="asof">Evidence as of {EVIDENCE_AS_OF}. The reports in docs/fork/ are the record; this page is a view of them.</p>
      </header>

      <section id="capabilities">
        <h2>The capability ledger</h2>
        <div className="cards">
          {CAPABILITIES.map((c) => (
            <article key={c.area} className="card">
              <p className="card-area">{c.area}</p>
              <p className="card-figure">{c.figure}</p>
              <h3>{c.headline}</h3>
              <p>{c.meaning}</p>
              {c.bars && <Bars bars={c.bars} />}
              {c.caveat && <p className="caveat">⚠ {c.caveat}</p>}
              <p className="source">source: {c.source}</p>
            </article>
          ))}
        </div>
      </section>

      <Lab />
      <Ask />

      <section id="failures">
        <h2>Where it currently fails</h2>
        <p className="lede">
          Failures are exhibits here, not footnotes. Two of them run live in your browser; the rest
          are recorded with their evidence and their fix routes.
        </p>
        <div className="cards">
          <article className="card failure">
            <p className="card-area">Known defect F1 · parse side</p>
            <h3>Chinese preverbal negation is dropped</h3>
            <p>
              不 and 没 before a verb are not yet carried into the meaning graph, so a negative
              sentence parses — and regenerates — as its affirmative. A silent, meaning-reversing
              loss: the worst kind, and the reason it leads this wall.
            </p>
            <LiveF1 />
            <p className="source">fix belongs to depth stage 5 · pinned by a test that names it a known defect</p>
          </article>
          <article className="card failure">
            <p className="card-area">Coverage gap · lexicon</p>
            <h3>Possessive “has” is not a verb yet</h3>
            <p>
              “Has” is classified only as an auxiliary, so as a main verb of possession the sentence
              has no predicate to build on and the parse abstains. Recorded during the stage-3
              construction work; not a census case, so it waits its turn rather than jumping the queue.
            </p>
            <LiveHasCold />
            <p className="source">recorded in docs/fork/construction-challenge.md</p>
          </article>
          {RECORDED_FAILURES.map((f) => (
            <article key={f.title} className="card failure">
              <p className="card-area">Recorded failure</p>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
              <p className="source">{f.status}</p>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <h2>Run the whole thing locally</h2>
        <p>
          This page runs the engine with its disk-backed providers off. The full system — WordNet
          provider, FrameNet bundle, every evaluation runner — is in the repository:
        </p>
        <pre>{`npm install
npm test                 # the suite (308 tests)
npm run fork:demo        # the 26-sentence exhibit
npm run fork:valency     # stage 1 report
npm run fork:aspect      # stage 2 report
npm run fork:construction  # stage 3 report
npm run fork:sense       # stage 4 report
npm run fork:chat        # the parser demonstrator

cd demo/dashboard && npm install && npm run dev   # this page`}</pre>
        <p className="caveat">
          Standing demotions, kept visible on purpose: the demo result is a fitted demonstration,
          not general accuracy · holdout rates are parse success, not correct meaning · the
          prediction and cycle-probe results are internal evidence until independently authored
          sealed sets reproduce them · mechanical reproducibility is not independent validation.
        </p>
      </footer>
    </div>
  );
}
