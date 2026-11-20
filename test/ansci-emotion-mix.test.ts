/**
 * ansci-emotion-mix.test.ts — the emotion-mix programme
 * (2026-11-19, the owner's "do mix machinery" commission).
 *
 * MIX-1 · The filing form. The vocabulary pass withheld
 * *nostalgic / nostalgia* and *sentimental* as owner
 * questions (GAPS §2, questions 3 and 4): each names a
 * feeling that is a COMBINATION, and the owner's doctrine
 * files a mix by its components and their cycle relations —
 * never averaged, never collapsed to a single element or
 * register. The owner has since ruled the two entries
 * (2026-11-19): nostalgia is a mix of pensiveness, sadness
 * and joy; sentimental is a mix of all five elements. This
 * file pins the form: the table (emotion-mix.ts), the
 * derived relations, and the LEDU reading that serves a mix
 * word as such.
 *
 * MIX-2 · The register walk reads mixes. A mix word
 * registers as a MIX ground in the uptake family: degree
 * from the word's own evidence, weight on the stated spine,
 * stance from the one component the visitor's own record
 * foregrounds (or no stance sentence at all), predication
 * of the word as told and never of a component. The
 * specimens below are driven at reply level, with the trace
 * proving the mix was never collapsed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { classificationsOf } from "../src/ansci/classify";
import { emotionAspect, mixEmotionAspect } from "../src/ansci/ledu";
import { coversAllElements, mixDerivation, mixFor, mixRelations } from "../src/ansci/emotion-mix";
import { classifyAspects } from "../src/ansci/assess";
import { parse } from "../src/ansci/parse";
import { enableWordnetLexicon } from "../src/ansci/wordnet-lex";
import { newSession, type Session, type StateRecord } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { assessUptakeGround, buildUptakeReply, degreeOf, registerKeyOf, registerOf } from "../src/ansci/uptake";

function state(holder: string, lemma: string, turn: number, extra: Partial<StateRecord> = {}): StateRecord {
  return { holder, lemma, turn, origin: { kind: "parsed" }, ...extra };
}

function drive(texts: string[]): { session: Session; replies: string[]; traces: any[] } {
  const session = newSession();
  const replies: string[] = [];
  const traces: any[] = [];
  for (const t of texts) {
    const r = processTurn(session, t);
    replies.push(r.reply);
    traces.push(r.trace);
  }
  return { session, replies, traces };
}

/* ---- MIX-1 data: the two ruled entries ---- */

test("MIX-1 data: the owner's two mix entries stand as ruled, components and provenance exact", () => {
  const nostalgia = mixFor("nostalgia");
  assert.ok(nostalgia, "nostalgia files as a mix");
  assert.deepEqual(
    nostalgia.components.map((c) => `${c.register}/${c.element}`),
    ["pensiveness/Earth", "grief/Metal", "joy/Fire"],
    "nostalgia: pensiveness (Earth) + grief (Metal) + joy (Fire) — the owner's sadness stands as the grief component, its face",
  );
  assert.equal(nostalgia.provenance, "owner determination (2026-11-19)");
  assert.equal(mixFor("nostalgic"), nostalgia, "the state form files under the same entry");

  const sentimental = mixFor("sentimental");
  assert.ok(sentimental, "sentimental files as a mix");
  assert.deepEqual(
    sentimental.components.map((c) => `${c.register}/${c.element}`),
    ["anger/Wood", "joy/Fire", "pensiveness/Earth", "grief/Metal", "fear/Water"],
    "sentimental: the five seated registers standing at once",
  );
  assert.equal(sentimental.provenance, "owner determination (2026-11-19)");
  assert.ok(coversAllElements(sentimental), "sentimental's components stand at all five elements");
  assert.ok(!coversAllElements(nostalgia), "nostalgia's do not");

  // No other word files as a mix under this programme —
  // and bittersweet in particular is NOT encoded: its two
  // readings stand unreconciled in the record and neither
  // is a ruled filing.
  assert.equal(mixFor("bittersweet"), undefined, "bittersweet stands unencoded, awaiting the owner's reconciliation");
  assert.equal(mixFor("sad"), undefined, "a seated word is not a mix");
  assert.equal(mixFor("guilty"), undefined, "the uncategorised register is not a mix");
  assert.equal(mixFor("disappointed"), undefined, "a filed category word is not a mix");
});

test("MIX-1 data: a mix word stands in NO classification entry — an entry asserts one element and would collapse it", () => {
  for (const w of ["nostalgia", "nostalgic", "sentimental"]) {
    assert.equal(
      classificationsOf(w).find((e) => e.aspect === "emotion"),
      undefined,
      `'${w}' has no emotion classification entry — the mix table is its only filing`,
    );
  }
});

/* ---- MIX-1: the derived relations ---- */

test("MIX-1: the components' cycle relations are derived from the elements, never stored", () => {
  const nostalgia = mixFor("nostalgia")!;
  const rels = mixRelations(nostalgia).map((r) => `${r.from.register} ${r.kind} ${r.to.register} (${r.via})`);
  assert.deepEqual(
    rels.sort(),
    [
      "joy controlling grief (Fire controls Metal)",
      "joy generating pensiveness (Fire generates Earth)",
      "pensiveness generating grief (Earth generates Metal)",
    ].sort(),
    "nostalgia's derived structure: a generating chain Fire→Earth→Metal, with Fire also controlling Metal",
  );

  const sentimental = mixFor("sentimental")!;
  const srels = mixRelations(sentimental);
  assert.equal(srels.filter((r) => r.kind === "generating").length, 5, "the full generating cycle runs among sentimental's components");
  assert.equal(srels.filter((r) => r.kind === "controlling").length, 5, "the full controlling cycle runs among them");
  assert.match(mixDerivation(sentimental), /both cycles run\s+fully among them/);
  assert.match(mixDerivation(nostalgia), /pensiveness \(Earth\) \+ grief \(Metal\) \+ joy \(Fire\) standing together/);
});

/* ---- MIX-1: the LEDU reading serves the mix as such ---- */

test("MIX-1: the LEDU mix reading serves the word as said, its components and their relations, no element asserted", () => {
  const reading = mixEmotionAspect("nostalgic");
  assert.ok(reading, "a mix word carries an emotion reading");
  assert.equal(reading.aspect, "emotion");
  assert.equal(reading.value, "nostalgic", "retention: the value is the word as said, never replaced by a component");
  assert.equal(reading.element, undefined, "no single element is asserted for a mix");
  assert.match(reading.source!, /emotion MIX \(the mix form; owner determination \(2026-11-19\)\)/);
  assert.match(reading.source!, /pensiveness \(Earth\) \+ grief \(Metal\) \+ joy \(Fire\)/);
  assert.match(reading.source!, /Fire generates Earth/);
  assert.match(reading.source!, /Fire controls Metal/);
  assert.match(reading.source!, /never an average of them/);

  // The seated reading never fires for a mix word (no
  // classification entry stands behind one), and the mix
  // reading never fires for a seated word.
  assert.equal(emotionAspect("nostalgic"), undefined);
  assert.equal(emotionAspect("sentimental"), undefined);
  assert.equal(mixEmotionAspect("sad"), undefined);
  assert.equal(mixEmotionAspect("disappointed"), undefined);

  const sentimental = mixEmotionAspect("sentimental");
  assert.ok(sentimental);
  assert.equal(sentimental.element, undefined);
  assert.match(sentimental.source!, /all five elements/);
});

test("MIX-1: the assessment serves the mix reading on a sentence that carries the word", () => {
  enableWordnetLexicon(true);
  const aspects = classifyAspects(parse("I am nostalgic.", "en"));
  const emotion = aspects.find((a) => a.aspect === "emotion" && a.value === "nostalgic");
  assert.ok(emotion, "the mix reading stands among the object's aspect readings");
  assert.equal(emotion.element, undefined, "and asserts no element there either");
  assert.match(emotion.source!, /emotion MIX/);
});

/* ------------------------------------------------------------------ */
/* MIX-2: the register walk reads mixes                                */
/* ------------------------------------------------------------------ */

test("MIX-2: registerOf files a mix word as a mix register, keyed on the mix, never on a component", () => {
  const mix = registerOf(state("you", "nostalgic", 2, { concept: "nostalgia" }));
  assert.equal(mix?.kind, "mix");
  assert.equal(mix && registerKeyOf(mix), "mix:nostalgia");
  assert.match(mix?.kind === "mix" ? mix.authority : "", /emotion-mix table files 'nostalgic' as a MIX/);
  assert.match(mix?.kind === "mix" ? mix.authority : "", /Fire generates Earth/);
  assert.match(mix?.kind === "mix" ? mix.authority : "", /never collapsed to a single element or register/);
  const sentimental = registerOf(state("you", "sentimental", 2));
  assert.equal(sentimental?.kind, "mix");
  assert.equal(sentimental && registerKeyOf(sentimental), "mix:sentimental");
  // The walk's other registers are untouched by the new leg.
  const sad = registerOf(state("you", "sad", 2));
  assert.equal(sad?.kind, "canonical");
  assert.equal(sad && registerKeyOf(sad), "grief");
  const guilty = registerOf(state("you", "guilty", 2));
  assert.equal(guilty?.kind, "uncategorised");
});

test("MIX-2 degree: a mix's degree is its own — Glasgow arousal on the word itself, or the unmarked degree said so", () => {
  const sentimental = degreeOf(state("you", "sentimental", 2));
  assert.equal(sentimental.degree, "plain", "sentimental's arousal 5.588 sits between the family's thresholds");
  assert.match(sentimental.evidence, /Glasgow arousal 5\.588/);
  assert.match(sentimental.evidence, /no single register to borrow a degree from/);
  const nostalgic = degreeOf(state("you", "nostalgic", 2));
  assert.equal(nostalgic.degree, "plain");
  assert.match(nostalgic.evidence, /no Glasgow value stands for it/);
  // A component's degree never leaks into the mix: grief's
  // own words price by their filings exactly as before.
  assert.equal(degreeOf(state("you", "sad", 2)).degree, "plain");
  assert.match(degreeOf(state("you", "sad", 2)).evidence, /Glasgow arousal 3\.941/);
});

test("MIX-2 specimen: 'I am nostalgic.' — the mix ground at weight 2 on the stated spine, no stance sentence, the word as told predicated", () => {
  const { session, replies, traces } = drive(["Hello.", "I am nostalgic."]);
  // Registration: the parse records the word bare (no
  // element, no concept — the mix filing is read by the
  // walk at ground time, not stored on the state).
  const st = session.states.find((s) => s.lemma === "nostalgic");
  assert.ok(st, "the telling's state stands in the record");
  assert.equal(st.element, undefined, "no element is recorded for a mix state");
  assert.equal(st.concept, undefined);
  const up = traces[1].uptake;
  assert.equal(up?.register, "mix:nostalgia");
  assert.equal(up?.ground, "stated");
  assert.equal(up?.degree, "plain");
  assert.equal(up?.weight, 2, "a plain first telling on the stated spine — the visitor DID state a feeling, in their own word");
  assert.equal(up?.returning, false);
  assert.equal(up?.stanceLemma, undefined, "no component stands in the record: no stance sentence");
  assert.deepEqual(up?.mix, {
    name: "nostalgia",
    components: ["pensiveness/Earth", "grief/Metal", "joy/Fire"],
  });
  assert.match(up?.provenance ?? "", /MIX ground/);
  assert.match(up?.provenance ?? "", /no single component is foregrounded/);
  assert.match(up?.provenance ?? "", /pensiveness \(Earth\) \+ grief \(Metal\) \+ joy \(Fire\)/);
  assert.equal(replies[1], "You are nostalgic.", "the neutral acknowledgement: the word as told, predicated — no component predicated, no stance borrowed");
});

test("MIX-2 specimen: 'I feel sentimental.' — feelings-first registration under the mix table, the ground at all five elements", () => {
  const { session, replies, traces } = drive(["Hello.", "I feel sentimental."]);
  // The parse records no state for this telling (the
  // pre-build diagnostic), so the feelings-first reader
  // registers it — under the mix table's leg.
  assert.equal(traces[1].feelingFirst?.lemma, "sentimental");
  assert.match(traces[1].feelingFirst?.authority ?? "", /emotion-mix table files 'sentimental' as a MIX/);
  assert.equal(traces[1].feelingFirst?.element, undefined);
  const st = session.states.find((s) => s.lemma === "sentimental");
  assert.ok(st);
  assert.equal(st.concept, "sentimental", "the registration's concept is the mix's name");
  assert.equal(st.element, undefined);
  const up = traces[1].uptake;
  assert.equal(up?.register, "mix:sentimental");
  assert.equal(up?.degree, "plain");
  assert.equal(up?.stanceLemma, undefined);
  assert.deepEqual(up?.mix, {
    name: "sentimental",
    components: ["anger/Wood", "joy/Fire", "pensiveness/Earth", "grief/Metal", "fear/Water"],
  });
  assert.match(up?.provenance ?? "", /all five elements/);
  assert.match(up?.provenance ?? "", /Glasgow arousal 5\.588/);
  assert.ok(replies[1].startsWith("You are sentimental."), replies[1]);
});

test("MIX-2: a mix restated after other conversation is a returning ground, read on the MIX's own timeline", () => {
  const { traces } = drive(["Hello.", "The salt is in the soup.", "I am nostalgic.", "The soup is hot.", "I am nostalgic."]);
  assert.equal(traces[2].uptake?.register, "mix:nostalgia");
  assert.equal(traces[2].uptake?.returning, false);
  assert.equal(traces[2].uptake?.weight, 2);
  const up = traces[4].uptake;
  assert.equal(up?.register, "mix:nostalgia");
  assert.equal(up?.returning, true, "the mix register stood before — its own timeline, not a component's");
  assert.equal(up?.weight, 3, "plain (2) + returning (1): the stated spine, unchanged");
  assert.equal(up?.stoodDown, undefined, "a return after other conversation is a new episode and is met again");
});

test("MIX-2 stance: the component the visitor's own record foregrounds lends its stance — sadness told, then nostalgia", () => {
  const { replies, traces } = drive(["Hello.", "I am sad.", "I am nostalgic."]);
  assert.equal(replies[1], "I am sorry. You are sad.", "the component alone behaves exactly as before (the negative control)");
  const up = traces[2].uptake;
  assert.equal(up?.register, "mix:nostalgia");
  assert.equal(up?.stanceLemma, "sorry", "the grief component is foregrounded by the standing sadness, and its stance answers");
  assert.match(up?.provenance ?? "", /foregrounds the 'grief' component/);
  assert.ok(replies[2].startsWith("I am sorry. You are nostalgic."), replies[2]);
  assert.ok(!/You are sad|You are joyful|You feel pensiveness/.test(replies[2]), "no component is predicated of the visitor — they stated the mix, not a component");
});

test("MIX-2 stance: two components standing foreground neither — the mix is not collapsed to either (ground level)", () => {
  const s = newSession();
  s.states.push(state("you", "sad", 2, { element: "Metal", concept: "grief" }));
  s.states.push(state("you", "joy", 3, { element: "Fire", concept: "joy" }));
  const ground = assessUptakeGround(s, state("you", "nostalgic", 4, { concept: "nostalgia" }));
  assert.ok(ground);
  assert.equal(ground.register.kind, "mix");
  assert.equal(ground.mix?.foregrounded, undefined, "grief and joy both stand: neither is THE foregrounded component");
  const built = buildUptakeReply(ground, () => undefined);
  assert.equal(built.stanceLemma, undefined);
  assert.equal(built.reply, "You are nostalgic.");
});

test("MIX-2 negative control: a component word alone is untouched by the mix machinery", () => {
  const { replies, traces } = drive(["Hello.", "I am sad."]);
  assert.equal(replies[1], "I am sorry. You are sad.");
  assert.equal(traces[1].uptake?.register, "grief");
  assert.equal(traces[1].uptake?.mix, undefined, "no mix field stands on a seated register's trace");
  assert.equal(traces[1].uptake?.stanceLemma, "sorry");
});

test("MIX-2 stance: the foregrounded component is read from the record, not fixed — joy standing lends 'glad'", () => {
  // 'I feel joy' registers through the classification entry
  // (Fire), and its registration supersedes the standing
  // sadness by the value rule (one emotion-aspect value
  // stands) — so at the mix's telling, joy is the ONE
  // component standing, and the stance is joy's.
  const { replies, traces } = drive(["Hello.", "I am sad.", "I feel joy.", "I am nostalgic."]);
  const up = traces[3].uptake;
  assert.equal(up?.register, "mix:nostalgia");
  assert.equal(up?.stanceLemma, "glad");
  assert.match(up?.provenance ?? "", /foregrounds the 'joy' component/);
  assert.ok(replies[3].startsWith("I am glad. You are nostalgic."), replies[3]);
});

test("MIX-2 stance: a NEGATED component state does not foreground — the absence family owns negations", () => {
  const { replies, traces } = drive(["Hello.", "I am not sad.", "I am nostalgic."]);
  const up = traces[2].uptake;
  assert.equal(up?.register, "mix:nostalgia");
  assert.equal(up?.stanceLemma, undefined, "the negated sadness stands in the record but foregrounds nothing");
  assert.equal(replies[2], "You are nostalgic.");
});

/* ------------------------------------------------------------------ */
/* MIX-3 (grain): the mix register in the ledger's movements           */
/* ------------------------------------------------------------------ */

test("MIX-3 grain: a mix state is superseded only by polarity — a seated feeling stated after it leaves it standing", () => {
  const session = newSession();
  const replies: string[] = [];
  const traces: any[] = [];
  for (const t of ["Hello.", "I am nostalgic.", "The soup is hot.", "I am not nostalgic.", "I am sad."]) {
    const r = processTurn(session, t);
    replies.push(r.reply);
    traces.push(r.trace);
  }
  // The negated restatement supersedes the mix state by the
  // POLARITY rule (same lemma, opposite polarity — the one
  // rule that needs neither an element nor an aspect).
  assert.equal(traces[3].correction?.rule, "polarity");
  assert.equal(replies[3], "You are not nostalgic.");
  // The seated feeling stated next does NOT supersede the
  // mix state: the value rule needs both states' elements
  // and a shared classification aspect, and a mix state has
  // neither — the mix stands BESIDE the seated registers in
  // the ledger, not in their slot. Both states stand.
  const standing = session.states.filter((s) => s.holder === "you").map((s) => `${s.lemma}${s.negated ? " (negated)" : ""}`);
  assert.deepEqual(standing.sort(), ["nostalgic (negated)", "sad"].sort());
  assert.equal(traces[4].uptake?.register, "grief", "the seated feeling's own uptake is unaffected");
});
