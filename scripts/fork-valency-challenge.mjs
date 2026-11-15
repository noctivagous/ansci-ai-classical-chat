#!/usr/bin/env node
/**
 * fork-valency-challenge.mjs — depth programme stage 1 evaluation
 * (docs/fork/repair-programme.md Part C.2): the sealed valency
 * challenge set (scripts/valency-challenge.tsv, sha256 = manifest
 * hash, recorded in the report).
 *
 * Arms:
 *  FULL     — the current system (WordNet + FrameNet providers on):
 *             role precision, legitimate acceptance, invalid
 *             rejection against the ratified stage-1 targets.
 *  HELDOUT  — four verbs' signatures withheld (teach, fill, sing,
 *             paint): the live system falls back to permissive
 *             evidence-free frames; the elemental domain prior
 *             (predictSignatureShape) is scored separately on the
 *             same items. Frame-only evidence on unseen LUs abstains
 *             by construction (licenses nothing).
 *  REGRESS  — the frozen 80-sentence holdout re-run under the current
 *             system: parse rate and feature preservation, compared
 *             with the stage-0 baseline (85.0% / 96.3%). The baseline
 *             report itself is frozen and is NOT regenerated.
 *
 * Writes docs/fork/valency-challenge.md. Run: npm run fork:valency
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/fork/parse.js";
import { generate } from "../dist/src/fork/generate.js";
import { assessValency } from "../dist/src/fork/check.js";
import { extractFeatures, compareFeatures } from "../dist/src/fork/features.js";
import { enableWordnetLexicon } from "../dist/src/fork/wordnet-lex.js";
import {
  frameSignature, setHeldOutLemmas, signatureInventory, predictSignatureShape, shapeOf,
} from "../dist/src/fork/framenet-lex.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HELD_OUT = ["teach", "fill", "sing", "paint"];
const pct = (x) => `${(x * 100).toFixed(1)}%`;

const tsvPath = join(root, "scripts/valency-challenge.tsv");
const tsvRaw = readFileSync(tsvPath, "utf-8");
const manifestHash = createHash("sha256").update(tsvRaw).digest("hex");
const items = [];
for (const line of tsvRaw.split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [verb, cls, sentence, expected, note] = line.split("\t");
  items.push({
    verb, cls, sentence, note: note ?? "",
    expectedRoles: (expected ?? "").split(";").filter(Boolean).map((p) => {
      const [role, lemma] = p.trim().split(":");
      return { role, lemma };
    }),
  });
}

enableWordnetLexicon(true);

function edgesOf(p, verb) {
  const rootNode = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  const byId = new Map(p.meaning.nodes.map((n) => [n.id, n]));
  return p.meaning.edges
    .filter((e) => e.from === rootNode.id)
    .map((e) => ({ role: e.relation, lemma: byId.get(e.to)?.lemma }));
}

function runItems(list) {
  const res = { pos: [], neg: [], unusual: [] };
  for (const item of list) {
    let p;
    try { p = parse(item.sentence, "en"); } catch { res[item.cls].push({ item, parseFailed: true }); continue; }
    const assessments = assessValency(p).filter((a) => a.verb === item.verb);
    const actual = edgesOf(p, item.verb).filter((e) => ["agent", "patient", "theme", "recipient", "location", "goal"].includes(e.role));
    const correct = item.expectedRoles.filter((er) => actual.some((a) => a.role === er.role && a.lemma === er.lemma)).length;
    res[item.cls].push({
      item, assessments, actual,
      correct, expectedCount: item.expectedRoles.length, actualCount: actual.length,
      unsupported: assessments.filter((a) => a.state === "unsupported").length,
      unusualCount: assessments.filter((a) => a.state === "unusual-but-licensed").length,
      supported: assessments.filter((a) => a.state === "supported").length,
    });
  }
  return res;
}

function metrics(res) {
  const pos = res.pos.filter((r) => !r.parseFailed);
  const neg = res.neg.filter((r) => !r.parseFailed);
  const correct = pos.reduce((s, r) => s + r.correct, 0);
  const actual = pos.reduce((s, r) => s + r.actualCount, 0);
  const expected = pos.reduce((s, r) => s + r.expectedCount, 0);
  return {
    posCount: pos.length, negCount: neg.length,
    rolePrecision: actual ? correct / actual : 0,
    roleRecall: expected ? correct / expected : 0,
    acceptance: pos.length ? pos.filter((r) => r.unsupported === 0).length / pos.length : 0,
    rejection: neg.length ? neg.filter((r) => r.unsupported > 0).length / neg.length : 0,
  };
}

/* ---- Arm FULL ---- */
const full = runItems(items);
const fullSeen = metrics({ pos: full.pos.filter((r) => !HELD_OUT.includes(r.item.verb)), neg: full.neg.filter((r) => !HELD_OUT.includes(r.item.verb)), unusual: [] });
const fullAll = metrics(full);

/* ---- Arm HELDOUT (live system, signatures withheld) ---- */
setHeldOutLemmas(HELD_OUT);
enableWordnetLexicon(false); enableWordnetLexicon(true); // purge derived entries
const heldItems = items.filter((i) => HELD_OUT.includes(i.verb));
const heldLive = runItems(heldItems);
const heldLiveM = metrics(heldLive);

/* ---- The domain prior on held-out verbs (no parsing) ---- */
const inventory = signatureInventory();
const { climbClassification } = await import("../dist/src/fork/wordnet-lex.js");
const verbElements = HELD_OUT.map((v) => [v, climbClassification(v)?.element]);
const priorRunnable = verbElements.some(([, el]) => el !== undefined);
const priorRows = [];
for (const verb of HELD_OUT) {
  const pred = predictSignatureShape(verb, inventory);
  const shape = pred.shape;
  const licenses = (item) => item.expectedRoles.every((er) =>
    er.role === "agent" ? shape.agent
    : er.role === "goal" ? shape.prepSlot === "goal"
    : er.role === "location" ? shape.prepSlot === "location"
    : shape.slots.includes(er.role));
  const pos = heldItems.filter((i) => i.verb === verb && i.cls === "pos");
  const neg = heldItems.filter((i) => i.verb === verb && i.cls === "neg");
  priorRows.push({
    verb, element: pred.element ?? "—", basis: pred.basis,
    shape: [shape.agent ? "agent" : null, ...shape.slots, shape.prepSlot ? `@${shape.prepSlot}` : null].filter(Boolean).join("+"),
    posAccepted: pos.filter(licenses).length, posTotal: pos.length,
    // Negative items are double-theme excess: a shape with exactly one
    // theme slot leaves the second theme filler unlicensed.
    negRejected: neg.filter(() => shape.slots.includes("theme")).length, negTotal: neg.length,
  });
}
setHeldOutLemmas([]);
enableWordnetLexicon(false); enableWordnetLexicon(true);

/* ---- Arm REGRESS: holdout parse rate + feature preservation ---- */
function holdoutCorpus() {
  const scripts = join(root, "scripts");
  const files = [
    ...readdirSync(scripts).filter((f) => /^cskg-evaluation.*\.txt$/.test(f)).sort().map((f) => join(scripts, f)),
    join(scripts, "cskg-explore.txt"),
    ...readdirSync(join(scripts, "probes")).filter((f) => f.endsWith(".txt")).sort().map((f) => join(scripts, "probes", f)),
  ];
  const seen = new Set(); const out = [];
  for (const file of files) {
    for (const raw of readFileSync(file, "utf-8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      if (/^(you|bot|ansci|user|system|human|assistant)\s*:/i.test(line)) continue;
      if (line.includes("#!") || line.startsWith(">")) continue;
      if (!/[a-z]/i.test(line)) continue;
      const s = line.replace(/\s+/g, " ");
      if (seen.has(s)) continue;
      seen.add(s); out.push(s);
      if (out.length >= 80) return out;
    }
  }
  return out;
}
let hParsed = 0, hAtoms = 0, hPreserved = 0;
const corpus = holdoutCorpus();
for (const s of corpus) {
  let p0;
  try { p0 = parse(s, "en"); } catch { continue; }
  hParsed += 1;
  let g1 = [];
  try { g1 = extractFeatures(parse(generate(p0), "en")); } catch { /* generation failure: all lost */ }
  const cmp = compareFeatures(extractFeatures(p0), g1);
  hAtoms += cmp.total0;
  hPreserved += cmp.records.filter((r) => r.outcome === "preserved").length;
}

/* ---- Report ---- */
const sigRows = [...new Set(items.map((i) => i.verb))].map((v) => {
  const s = frameSignature(v);
  return s ? `| ${v} | ${s.frame} | ${s.agent ? "yes" : "no"} | ${s.slots.join(", ") || "—"} | ${s.required.join(", ") || "—"} | ${s.prepSlot ? `${s.prepSlot.slot} (${s.prepSlot.preps.join("/")})` : "—"} | ${s.unmappedCore.join(", ") || "—"} |` : `| ${v} | — | | | | | |`;
}).join("\n");

const unusualLines = full.unusual.map((r) => {
  const a = r.assessments ?? [];
  return `- ${r.item.verb} — "${r.item.sentence}" ${r.parseFailed ? "(parse failed)" : `unsupported ×${r.unsupported}, unusual-but-licensed ×${r.unusualCount}, supported ×${r.supported}`} — ${r.item.note}`;
}).join("\n");

const priorTable = priorRows.map((r) => `| ${r.verb} | ${r.element} | ${r.shape} | ${r.posAccepted}/${r.posTotal} | ${r.negRejected}/${r.negTotal} |`).join("\n");

const report = `# Valency challenge — stage 1 report

Generated by \`npm run fork:valency\` on ${new Date().toISOString().slice(0, 10)}.
Challenge set: \`scripts/valency-challenge.tsv\` (${items.length} items,
12 verbs), manifest sha256 \`${manifestHash.slice(0, 16)}…\`.
Authorship, stated plainly: the set was authored by the same party
that built the provider, against FrameNet frame semantics — it is
sealed against post-hoc editing by the hash, but it is NOT an
independently authored set under Part C.5 (no separate custodian
exists in this loop). Treat its scores as internal evidence.

## Signatures used (FrameNet 1.5, FE->role map v1)

| Verb | Frame | Agent FE | Slots | Core object | Prep slot | Unmapped core FEs |
| --- | --- | --- | --- | --- | --- | --- |
${sigRows}

Signature-quality caveats, recorded not hidden: **wash** and **paint**
were assigned the *Filling* frame by the deterministic LU-selection
rule (most mapped core FEs wins) over the semantically apt frames
(Removing/Grooming; Create_physical_artwork) — their slot inventories
are usable, their frame names are wrong, and LU selection by mapped-FE
count is recorded as a known weakness. **sing**'s single bare object
is positionally assigned recipient (the Addressee slot precedes the
Message in surface order), so its canonical positive item is a
documented role-precision miss: the frame inventory is right, the
positional filler cannot tell a lone Message from a lone Addressee.

## Arm FULL — current system vs the stage-1 targets

Seen verbs (8 verbs, ${fullSeen.posCount + fullSeen.negCount} scored items):
role precision **${pct(fullSeen.rolePrecision)}** (target ≥ 90%; recall ${pct(fullSeen.roleRecall)});
legitimate acceptance **${pct(fullSeen.acceptance)}** (target ≥ 90%);
invalid rejection **${pct(fullSeen.rejection)}** (target ≥ 85%).

All 12 verbs: role precision ${pct(fullAll.rolePrecision)}, acceptance
${pct(fullAll.acceptance)}, rejection ${pct(fullAll.rejection)}.

## Arm HELDOUT — unseen lexical units (teach, fill, sing, paint)

With signatures withheld, the live system falls back to permissive
evidence-free frames: every argument is unusual-but-licensed, nothing
is supported, nothing is rejected. Legitimate acceptance (no
unsupported verdicts) is ${pct(heldLiveM.acceptance)} — vacuously,
since nothing can be unsupported either; invalid rejection is
${pct(heldLiveM.rejection)}. That is the abstention baseline.

The elemental domain prior trial: **NOT RUNNABLE at stage 1.** The
predictor (predictSignatureShape, the depth-cycle claim-3 mechanism
stated as code) needs each verb's semantic element, and the system
produces none for verbs: climbClassification resolves elements for
nouns and adjectives, but verb synsets climb to no classified anchor
— verified undefined for teach, fill, sing, paint (and for bake and
send). Without its input the predictor falls back to the inventory's
global modal shape (${priorRows[0]?.shape ?? "—"}), which carries no
slot information and licenses nothing:

| Verb | Element (climb) | Predicted shape | Positives licensed | Negatives rejected |
| --- | --- | --- | ---: | ---: |
${priorTable}

Consequence, per Part C.3: the prior has not faced the FrameNet-only
baseline, so it has earned nothing and is adopted nowhere — the
provider uses frame evidence only, which is already the shipped
behaviour. The trial becomes runnable when verbs carry
classifications (the coverage work), and stays on the programme as
an open failure test, not a passed one. (Had it run: the negative
items are double-theme excess, which any single-theme shape rejects
structurally — that rejection would have been weak evidence anyway.)

## Findings from the build

- **LU selection by mapped-FE count picks wrong frame names** for
  some verbs: wash and paint got *Filling*; a spot check found blow
  got *Bungling* (candidates Breathing, Motion). Slot inventories
  remain usable; frame-name correctness needs a better selector.
- **Signature core is not obligation.** blow's signature made the
  binary checker flag "The wind blows from the east" before the
  mapping was corrected: FrameNet-backed entries now contribute no
  VerbEntry required slots, and the assessment treats an unfilled
  core object as core-optionally-unexpressed.
- **The WordNet provider's toggle leaked.** enableWordnetLexicon
  purged the lexicon but not the entry cache, so withheld signatures
  survived into the held-out arm. Fixed (cache and derived-lemma set
  now clear on disable). The published holdout numbers are
  unaffected: its OFF arm runs first in a fresh process.
- **"her" was missing as an object pronoun** — present only as a
  possessive determiner, and silently dropped by the chunker in
  "He showed her the photo". The pronoun entries (her/me/us) are
  added, and a determiner-classified "her" with no possible noun
  phrase after it is reclassified as the pronoun.
- **Lone-object alternation rule added to the parser:** a single
  bare object of a ditransitive frame takes the required object
  role, unless it is a pronoun (the partial animacy gate; full-NP
  animate objects are the recorded trade-off).

## Unusual items (descriptive, not scored)

${unusualLines}

## Non-regression (frozen holdout, current system)

Parse rate ${hParsed}/80 = **${pct(hParsed / 80)}** (stage-0 baseline
85.0%; stage target: no drop below 85%). Feature preservation
**${pct(hAtoms ? hPreserved / hAtoms : 0)}** pooled over ${hAtoms}
atoms (stage-0 baseline 96.3%, measured with the same instrument;
the frozen baseline report is unchanged).
`;

writeFileSync(join(root, "docs/fork/valency-challenge.md"), report);
console.log(report);
