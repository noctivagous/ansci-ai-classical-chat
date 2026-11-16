import { useMemo } from "react";
import { CAPABILITIES, EVIDENCE_AS_OF, SENSE_ROWS } from "./evidence";
import Lab from "./Lab";
import Ask from "./Ask";
import Roadmap from "./Roadmap";
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
          — negation present in the parse: <strong>{outcome.negated ? "yes" : "no"}</strong>.
          {outcome.negated
            ? " The negation survives the round trip: closed at stage 5."
            : " The sentence comes back affirmative and the checker says nothing."}
        </>
      )}
    </p>
  );
}

const FIRST_STEPS: { priority: string; task: string; requirements: string }[] = [
  {
    priority: "1 · Dialogue core",
    task: "Grow the steering probe (src/fork/turn.ts) into a session: state that persists across turns, an intent arc, and a situation model maintained by the directing layer.",
    requirements:
      "Transcripts are the acceptance test — every turn checkable in its trace, with the mechanism named. Questions arise only from a genuine gap in the combined conclusions, never from a template. What a conversation establishes reaches the durable graph only through the gated banking pipeline.",
  },
  {
    priority: "2 · Reply generation",
    task: "Make the generator the reply surface: plan a meaning graph from the turn's conclusions, situation and intent, and generate the reply sentence from that graph.",
    requirements:
      "No canned sentence whose content is not in the reply's own meaning graph. Every claim inspectable back to the derivation that produced it. Confidence carried through — weak derivations surface hedged — and abstention is a legitimate reply, produced by the mechanism, not by a deflection template.",
  },
  {
    priority: "3 · Coverage growth",
    task: "The three items at the head of the Coverage tab's list: the H7 banking pass over the mineral survey, the anchor-quality audit and repair, and the ingestion pipeline over the classical texts as its own slice.",
    requirements:
      "Every classification is an (concept, aspect) assertion with provenance and confidence — never an entity classified wholesale. Inference is priced always: a heuristic output names its registered rule and version, or it stands as an unresolved case. Attested tradition, creative application and analysis stay in distinct labelled layers; ingested text enters only with a citation.",
  },
  {
    priority: "4 · Independent evaluation",
    task: "WP2, the judged benchmark; the first sealed set under the full C.5 protocol; and the H3 sense experiment, including its Chinese arm.",
    requirements:
      "The tooling landed on 2026-11-15 — the sealed-set machinery and the review-triage queue are built and in the repo. What this needs now is people: an item author independent of the builders, a custodian distinct from the author, and judges who are never the builder. Bars are ratified before the run (precision ≥90% with the lower bound ≥85%; unsupported inferences ≤5%). H3 additionally needs 60 native Chinese speakers.",
  },
  {
    priority: "5 · Feeders & banking",
    task: "The tiers beyond CSKG, behind the same provider interface: Wikidata for facts, the web for procedures, a small model last — and the banking pipeline that distils successful retrievals into the overlay graph.",
    requirements:
      "CSKG ingestion is built (2026-11-15) and its extract installs locally as a feeder; the data is a local artifact, never shipped in the repo. Routing order is fixed — local graph, Wikidata, web, model — and a later tier is reached only when the earlier ones genuinely come back empty. Every answer carries its provenance visibly; banked edges live only in the overlay graph and enter at derived confidence.",
  },
  {
    priority: "6 · The gardener",
    task: "Two decisions before any build: the scope (development loop first, or live runtime as well) and the model (a hosted fast model, or a local 3–4B-class model behind the same provider interface).",
    requirements:
      "Both decisions are the owner's and both are open; until they are taken, the gardener stays a design record. When it is built: code changes are proposals with diffs and reasons, graph adjustments are gated and logged, and every fix is judged on a fresh holdout, never on the material that produced the failure.",
  },
  {
    priority: "7 · Runtime & access",
    task: "Session persistence, an asset strategy for the lexical providers, and a first served surface — the simplest real one — over the same engine.",
    requirements:
      "The core conversation loop runs fully offline against the local graph; connectivity buys reach, never basic function. A conversation survives restarts, with its memory boundary enforced by storage, not convention. Degraded configurations label themselves in the interface before they are asked a question they cannot answer.",
  },
];

const RECORDED_FAILURES: { title: string; body: string; status: string }[] = [
  {
    title: "Sense selection can be talked out of the right answer (X1)",
    body: "In the sealed sense set, “The stock simmered in the pot” was overturned from broth (Water, correct) to bloodline (Fire): the pot's own Earth classification supported the wrong sense through a generating relation. The cycles amplify whatever classifications they touch — including wrong ones. The anchor-quality repair (2026-11-15) removed the rival itself — stock's Fire candidate arrived through blood's lineage synset, a spelling-match artifact — and the sealed set now reads 6/6. The scorer flaw the failure exposed (generation support runs in both directions) is NOT fixed; it has lost the wayward candidate it acted on. Direction-sensitive support remains the recorded v2 direction.",
    status: "rival removed by the anchor repair · scorer v2 not yet built · recorded in docs/fork/sense-challenge.md",
  },
  {
    title: "The elemental valency prior was tested — and failed",
    body: "The programme's sharpest open question — does a verb's element predict its argument shape better than FrameNet alone? — has been run, and at the strength claimed the answer is no. Verbs were classified (574 of 3,071, by a stated gloss rule), the trial ran on held-out verbs, and on the predeclared headline (exact shape match) the prior tied the FrameNet-only baseline 0/4; under the rule set down when the test was designed, a tie fails it. Partial-credit measures favoured the prior throughout — within each element the shapes spread too widely for a single best guess to carry the signal. The prior remains adopted nowhere; the verb classifications are banked as labelled derivations.",
    status: "trial run 2026-11-15 · verdict in docs/fork/verb-classification-trial.md · prior adopted nowhere",
  },
  {
    title: "H3a vs H3b — the sense rivalry — is unsettled",
    body: "Two preregistered accounts of sense priority (Water-first vs Earth-restraint) make different predictions in conflicted sentences. The deciding instrument is a human experiment — free interpretation before forced choice, dozens of judges, a Chinese arm with 60 native speakers. It cannot be supplied inside this project loop, so the rivalry stays honestly open.",
    status: "preregistered 2026-11-15 · awaiting external judges",
  },
  {
    title: "Anchor coverage is the binding constraint",
    body: "Of 8,094 polysemous words, only 19 have anchored senses in more than one element. The wayward paths are repaired — anchors now fire only on the dictionary senses carrying their classification, so rock no longer arrives at Earth via “sweet” — but the repair cost coverage: words with any anchored candidate fell from 646 to 416, and the lost candidates have not been judged one by one. Better disambiguation cannot fix thin anchors; classification coverage is the long pole.",
    status: "repair measured in docs/fork/anchor-audit.md · coverage still the constraint",
  },
  {
    title: "Review does not scale yet",
    body: "At ×100 classification density the review queue is 1,047 items — beyond hand review — and the automatic precision proxy degrades (0.917 → 0.751 on the first run; 0.913 → 0.752 after the H6 re-scope and follow-on). Whether the proxy or the derivations are wrong is undecided until the judged benchmark (WP2) gets independent human judges.",
    status: "open · triage protocol ratified, judges not yet available",
  },
  {
    title: "The coverage bar was measuring the wrong thing — reframed by Part E",
    body: "The Slice 1 pilot fell short of its ≥90% coverage bar (80 of 100 objects carrying any assertion) on a sample deliberately loaded with cases the protocol requires abstention on. The project's own review concluded the bar itself was the catalogue mindset in disguise: an ontology whose purpose is to generate knowledge by correspondence was being scored on how little it dared to infer. Part E (adopted 2026-11-15) re-reads the pilot as an assertion-layer test, keeps its accuracy figures, supersedes the bar, and scores the 500-object run on three separate evaluations — heuristic coverage per epistemic tier, validated accuracy, and abstention discipline — with a brakes amendment: an inference counts only when it names a registered rule with stated scope, priced confidence and a falsification condition.",
    status: "resolved as policy in repair-programme.md Part E · the 400-object test sample is ready",
  },
  {
    title: "Weather entries predating the H6 discipline — follow-on closed",
    body: "The H6 re-scope withdrew the table's whole-phenomenon entries for rain, snow, sleet and hail, and flagged four more of the same shape. The follow-on has run: frost and fog are withdrawn to phase-null (fog's candidacy runs through moisture, whose correspondence the rule refuses to automate), ice is re-scoped to the substance aspect — frozen water as a stuff, on the rainwater precedent — and storm to its wind aspect only, its precipitation aspect explicitly not asserted. No climb regressions followed; the density figures moved exactly by the withdrawn assertions' derivations.",
    status: "closed 2026-11-15 · recorded in the H6 registry entry",
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
          coverage — and a gain in one is never presented as a gain in another. Below: the engine
          itself to try, the measured capabilities with their caveats attached, the traces behind its
          answers, and a wall of named failures.
        </p>
        <p className="asof">Evidence as of {EVIDENCE_AS_OF}. The reports in docs/fork/ are the record; this page is a view of them.</p>
      </header>

      <Ask />

      <section id="path">
        <h2>Path to a working chatbot</h2>
        <p className="lede">
          Everything below this section is built and measured: the parser, the ontology, their
          evaluations. A working chatbot is a further system on top of them, and it has parts —
          each with its own remaining steps and its own requirements. The tabs give each part
          separately, with its status stated plainly; the statuses are never averaged into a
          single readiness number, for the same reason this page has no percentage. Each part's
          roadmap is a task list — a ticked box is work already in place, an empty one is work
          outstanding — and its requirements are the acceptance checklist that must fully hold
          before that part may be called done.
        </p>
        <Roadmap />
      </section>

      <section id="first">
        <h2>What comes first</h2>
        <p className="lede">
          The tabs above are the whole map, part by part. This is the order to work them in.
          The first two rows are the path to anything that can be called a chat at all; the
          rest are ordered by when work on them has to start — the evaluation row stands high
          because its missing ingredient is people, and people take the longest to arrange.
          Each row states what the task requires before it can be called done; the fuller
          acceptance checklists stay in the tabs.
        </p>
        <table className="first-table">
          <thead>
            <tr>
              <th>Priority</th>
              <th>Task requirements</th>
            </tr>
          </thead>
          <tbody>
            {FIRST_STEPS.map((s) => (
              <tr key={s.priority}>
                <td className="pri">
                  <strong>{s.priority}</strong>
                  <span className="pri-task">{s.task}</span>
                </td>
                <td>{s.requirements}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
        <details className="panel sense-table">
          <summary>
            Inspect the sense decisions item by item — set A (development) and set B (sealed,
            run once), with the mechanism's support scores
          </summary>
          <table>
            <thead>
              <tr>
                <th>Set</th>
                <th>Target</th>
                <th>Sentence</th>
                <th>Expected</th>
                <th>Climb alone</th>
                <th>Coherence</th>
                <th>Support</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {SENSE_ROWS.map((r, i) => (
                <tr key={i} className={r.verdict === "FAIL" ? "fail-row" : ""}>
                  <td>{r.set}</td>
                  <td>{r.target}</td>
                  <td>{r.sentence}</td>
                  <td>{r.expected}</td>
                  <td>{r.baseline}</td>
                  <td>{r.coherence}</td>
                  <td className="mono">{r.support}</td>
                  <td>{r.verdict === "FAIL" ? "✗" : "✓"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="caveat">
            Transcribed from docs/fork/sense-challenge.md. Support = same element 1.0, generating
            0.8, controlling 0.4 — corroboration only; restraint never subtracts.
          </p>
        </details>
      </section>

      <Lab />

      <section id="failures">
        <h2>Where it currently fails</h2>
        <p className="lede">
          Failures are exhibits here, not footnotes. Two of them run live in your browser; the rest
          are recorded with their evidence and their fix routes.
        </p>
        <div className="cards">
          <article className="card failure">
            <p className="card-area">Depth stage 5 — built · known defect F1, closed</p>
            <h3>Chinese preverbal negation was dropped — fixed through the ontology</h3>
            <p>
              不 and 没 before a verb used to fall through every branch of the parser, so a
              negative sentence parsed — and regenerated — as its affirmative: a silent,
              meaning-reversing loss, and the reason this card led the wall. Stage 5 closed it
              the way Part F requires — not with a patch but with the mechanism: negation is a
              structured state (a Water state with a Metal carrier), the Chinese negator's form
              is selected by the negated verb's aspect bundle, and the negation family rose from
              84.4% to 91.2%, over its floor. The programme's ≥95% aggregate is now claimed —
              97.7–98.2% — with two families (precision, suppressed roles) declared ontology
              failures in the stage report rather than quietly engineered around.
            </p>
            <LiveF1 />
            <p className="source">docs/fork/stage-5-report.md · the pinning test was flipped deliberately, as the baseline prescribed</p>
          </article>
          <article className="card failure">
            <p className="card-area">Surface limits</p>
            <h3>The chat surface is a demonstrator, honestly labelled</h3>
            <p>
              The evaluated transcripts are the four scripted scenarios; free conversation has not
              been through an acceptance pass. Reply wordings are a small hand-written set steered
              by the mechanism — the generator is not yet the reply surface. By the project's own
              assessment the system is very far from a usable chat; what exists is a parser and
              evaluation demonstrator, and this page presents it as exactly that.
            </p>
            <p className="source">fork status, 2026-11-15 · the steering probe is in src/fork/turn.ts</p>
          </article>
          <article className="card failure">
            <p className="card-area">Coverage gap · lexicon — closed</p>
            <h3>Possessive “has” was not a verb</h3>
            <p>
              “Has” was classified only as an auxiliary, so as a main verb of possession the
              sentence had no predicate to build on and the parse abstained. Fixed in the
              pre-stage-5 batch: when no participle follows for the auxiliary to carry, the
              token is reclassified as the verb “have” — and the perfect reading (“She has
              eaten…”) is untouched, as the live check's sibling cases in the test suite show.
            </p>
            <LiveHasCold />
            <p className="source">recorded in docs/fork/construction-challenge.md · fixed 2026-11-15</p>
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
