/**
 * ansci-normalcy.test.ts — the Normalcy arc (2026-11-17).
 *
 * The owner's specimen sheet (chat-normalcy.txt) is DESIGN
 * GUIDANCE for this file: the tests pin BEHAVIOUR — the move
 * chosen, the evidence source, the flag raised and priced, the
 * ledger state, the absence of verdict vocabulary in replies —
 * not the specimens' exact wording, except where the content
 * itself is the fact (the ledger's answer).
 *
 * The arc, in one paragraph: NormalcyAssessment (the LPU's
 * bridge to the NormalcyUnit) reads each assessed object after
 * Session & Situation and before CoherenceAnalysis, and files
 * flags — obviousness, self-redundancy, gibberish — on the
 * information object's ENVELOPE. Coherence prices the flags by
 * kind. The flags are internal thoughts: no reply ever speaks
 * one. The reply moves pinned here: the record answer ("You
 * said so."), the definitional answer, the acknowledgement,
 * generalised filler-asking (the emotion-object hole, the
 * unanchored definite, the missing-role valency mode), and
 * the gibberish repair.
 *
 * The governing principle (the owner's words): the tables
 * supply KNOWLEDGE about the communication, never the
 * system's values — no table number sets a price, fires a
 * flag by itself, or decides a reply. The two discipline pins
 * below hold that line.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn, type TurnResult } from "../src/ansci/turn";
import { assessNormalcy } from "../src/ansci/normalcy-assessment";
import { createInformationObject, stripEnvelope, type InformationObject } from "../src/ansci/info-object";
import type { ParsedSentence } from "../src/ansci/sentence";

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}
function persons(session: Session): InformationObject[] {
  return session.objects.filter((o) => o.producer === "person") as InformationObject[];
}

/** The verdict vocabulary: words that would speak a flag or a
 *  judgement about oddity. The hard rule — no reply carries
 *  them. ("Gibberish?" in the repair is the specimen's own
 *  sanctioned wording: a tentative QUESTION, not a verdict,
 *  and not in this set.) */
const VERDICT = /\b(odd|obvious|redundan\w*|abnormal|strange|weird|nonsense)\b/i;
function noVerdict(reply: string): void {
  assert.ok(!VERDICT.test(reply), `reply speaks a verdict about oddity: ${reply}`);
}

/* ---------------- (d iii) missing-role valency: "I gave him." ---------------- */

test("specimen: 'I gave him.' asks after the missing theme — the gap is named, not declined past", () => {
  const s = newSession();
  const [r] = run(s, ["I gave him."]);
  noVerdict(r.reply);
  assert.equal(r.trace.declineReason, undefined, "no bare decline");
  assert.equal(r.trace.gapQuestion?.verb, "give");
  assert.equal(r.trace.gapQuestion?.role, "theme", "the theme hole is the gap named");
  assert.match(r.reply, /What did you give him\?/, "the reply asks after the theme");
  assert.match(r.trace.gapQuestion?.ground ?? "", /requires its theme/, "the ground is the frame evidence");
});

test("missing-role mode: the hand lexicon's obligation asks outright ('I gave.')", () => {
  const s = newSession();
  const [r] = run(s, ["I gave."]);
  assert.equal(r.trace.gapQuestion?.role, "recipient", "the first unfilled required role, in frame order");
  assert.match(r.reply, /Who did you give\?/);
});

test("missing-role mode: a FrameNet core role asks only when the construction is underway", () => {
  // 'send' is FrameNet-derived (Giving/Sending family): with a
  // recipient realised, the theme hole is askable; bare, the
  // use may be a licensed intransitive and the mode abstains.
  const s1 = newSession();
  const [r1] = run(s1, ["I sent him."]);
  assert.equal(r1.trace.gapQuestion?.role, "theme");
  assert.match(r1.reply, /What did you send him\?/);

  const s2 = newSession();
  const [r2] = run(s2, ["I donated."]);
  assert.equal(r2.trace.gapQuestion, undefined, "no core object realised — ambiguous evidence, no asking");
  assert.equal(r2.reply, "Ok. Noted.", "the bare use is acknowledged, not interrogated");
});

/* ---------------- (d ii) the unanchored definite ---------------- */

test("specimen: 'Is the table cold?' as a cold open asks after the referent", () => {
  const s = newSession();
  const [r] = run(s, ["Is the table cold?"]);
  noVerdict(r.reply);
  assert.equal(r.trace.declineReason, undefined, "the turn asks back instead of declining");
  assert.equal(r.trace.unanchoredDefinite?.lemma, "table");
  assert.match(r.reply, /^What table\?/, "the reply asks after the referent");
  assert.match(r.reply, /just started talking/, "the machinery knows it is the conversation's first turn");
  // The question's own answer need stays open — it survives,
  // priced, because the turn asked back rather than answering.
  const need = persons(s)[0].envelope.needs.find((n) => n.kind === "answer");
  assert.equal(need?.status, "surviving");
});

test("unanchored definite, mid-conversation: the wording knows it is not the opening", () => {
  const s = newSession();
  const [, r2] = run(s, ["The soup is hot.", "Is the table cold?"]);
  assert.equal(r2.trace.unanchoredDefinite?.lemma, "table");
  assert.match(r2.reply, /^What table\?/);
  assert.ok(!/just started/.test(r2.reply));
});

test("unanchored definite, controls: an established or classified referent is answered, not asked after", () => {
  // The soup was mentioned: established — the ordinary routes answer.
  const s1 = newSession();
  const [, r2] = run(s1, ["The soup is hot.", "Is the soup hot?"]);
  assert.equal(r2.trace.unanchoredDefinite, undefined);
  // Salt is a classified kind used definitely: answered from
  // the derivation, as before the arc.
  const s2 = newSession();
  const [r] = run(s2, ["Is the salt cold?"]);
  assert.equal(r.trace.unanchoredDefinite, undefined);
  assert.equal(r.reply, "The salt is cold.");
});

/* ---------------- (d i) the emotion-object hole ---------------- */

test("specimen: 'I was furious.' asks after the emotion's object", () => {
  const s = newSession();
  const [r] = run(s, ["I was furious."]);
  noVerdict(r.reply);
  assert.match(r.reply, /Furious about what\?/, "the coherence demand asks for the unexpressed cause");
});

/* ---------------- (d) the directed target: "I shouted." ---------------- */

test("specimen: 'I shouted.' asks after the directed target", () => {
  const s = newSession();
  const [r] = run(s, ["I shouted."]);
  noVerdict(r.reply);
  assert.equal(r.trace.gapQuestion?.role, "recipient");
  assert.match(r.trace.gapQuestion?.ground ?? "", /directed target/);
  assert.match(r.reply, /Shouted at who\?/, "the question keeps the frame's preposition");
});

/* ---------------- (a) the record answer: the soup pair ---------------- */

test("specimen: the soup pair — the telling acknowledged, the restated question answered from the record", () => {
  // PREMISE CORRECTION (property-axes slice, 2026-11-18):
  // this specimen's original pins were corrected by
  // conversation-shapes C7, which extended the premise
  // stance to the soup telling on the ground that
  // premiseDegree(soup, hot) contradicted from the graph.
  // That ground conflated two property axes (design record
  // Part H): soup's Water is its matter phase (a liquid
  // food), and temperature is a separate axis on which the
  // graph holds no determination for soup. The premise
  // degree's temperature check now consults temperature-axis
  // determinations only, so the telling is absence, not
  // contradiction — recorded as told, as S5's stance never
  // legitimately applied to it (its refusal of "Why is the
  // soup hot?" stood on the same derivation and falls with
  // it; the stance's protected claim — a positively
  // contradicted premise meets the stance — stands on the
  // winter cases). The specimen's original pins are restored
  // verbatim below.
  const s = newSession();
  const [t1, t2] = run(s, ["The soup is hot.", "Is the soup hot?"]);
  noVerdict(t1.reply);
  noVerdict(t2.reply);
  assert.equal(t1.reply, "Ok. Noted.", "a third-person telling is acknowledged, not steered at");
  assert.equal(t2.reply, "You said so.", "answered from the record, in the said-so family");
  // The evidence source is the record: the trace names the
  // stating turn, and the flag behind the move is filed and
  // priced — internally.
  assert.equal(t2.trace.saidSo?.stateTurn, 1);
  const flag = t2.trace.normalcy?.flags.find((f) => f.kind === "self-redundancy");
  assert.ok(flag, "the self-redundancy flag stands on the trace");
  assert.ok(flag!.standing, "Coherence priced the flag (its standing is recorded)");
  assert.equal(t2.trace.pricing, undefined, "no derivation price is fabricated for a record answer");
  // The record route outranks the R7.5 record graph here —
  // and the R7.5 route itself is untouched where the occupant
  // is not the asked predication (next test).
});

test("record routes: where the standing occupant differs from the asked quality, the R7.5 record graph still answers", () => {
  const s = newSession();
  // Fixture restored (property-axes slice, 2026-11-18): the
  // telling subject was the soup until C7 swapped in the
  // garden, on the ground that the soup's 'hot' was
  // graph-contradicted. That derivation crossed axes (Part
  // H) and is removed; the soup telling stands in the record
  // again, and the route this test exercises is unchanged.
  const [, r2] = run(s, ["The soup is hot.", "Is the soup cold?"]);
  assert.equal(r2.reply, "The soup is hot.");
  assert.ok(r2.trace.answeredFromRecord, "the record graph answered");
  assert.equal(r2.trace.saidSo, undefined, "the speaker did not state the asked predication");
});

/* ---------------- (b) the definitional answer: winter ---------------- */

test("specimen: 'Is winter cold?' is answered from the Classification, citing the definition", () => {
  const s = newSession();
  const [r] = run(s, ["Is winter cold?"]);
  noVerdict(r.reply);
  assert.match(r.reply, /definition/, "the reply cites that it holds by definition");
  assert.match(r.reply, /winter is cold/);
  assert.equal(r.trace.definitionalAnswer?.subject, "winter");
  assert.equal(r.trace.definitionalAnswer?.quality, "cold");
  const flag = r.trace.normalcy?.flags.find((f) => f.kind === "obviousness");
  assert.ok(flag, "the obviousness flag was raised");
  assert.ok(flag!.standing, "and priced by Coherence — internally, never spoken");
  assert.equal(r.trace.pricing, undefined, "no derivation price stands behind a definitional answer");
});

test("definitional scope: a synonym of the classifying quality is the derivation's business, not the definition's", () => {
  // 'hot' is filed as a synonym of the profile's 'warm'; the
  // definitional settlement is for the profile's own wording.
  const s = newSession();
  const [r] = run(s, ["Is summer hot?"]);
  assert.equal(r.trace.definitionalAnswer, undefined);
  assert.ok(r.trace.composition, "the composition answers, as before the arc");
});

test("definitional scope: a why-question keeps the derivation", () => {
  const s = newSession();
  const [r] = run(s, ["Why is winter cold?"]);
  assert.equal(r.trace.definitionalAnswer, undefined);
  assert.equal(r.reply, "Winter is cold, because it is most fully cold.");
});

/* ---------------- (c) the acknowledgement: the apples sequence ---------------- */

test("specimen: the apples sequence — tellings acknowledged, no arithmetic volunteered, the asked answer from the ledger", () => {
  const s = newSession();
  const [t1, t2, t3] = run(s, ["I have 5 apples.", "Sally bought 3 of them.", "How many apples do I have left?"]);
  noVerdict(t1.reply);
  noVerdict(t2.reply);
  assert.equal(t1.reply, "Ok. Noted.");
  assert.equal(
    t2.reply,
    "Ok.",
    "the transfer turn is a plain acknowledgement — the steering question it used to draw is retired (owner-approved by the specimen)",
  );
  assert.ok(!/\d|two|three|five/i.test(t1.reply + t2.reply), "the telling turns volunteer no arithmetic");
  // The ledger did the arithmetic at recording, as before:
  // after the transfer, the tracked amount stands at 2.
  const latest = [...s.quantities].reverse().find((q) => q.holder === "you" && q.kind === "apple");
  assert.equal(latest?.amount, 2, "the ledger's tracked amount after the transfer");
  assert.equal(t3.reply, "You have two apples left.", "the asked answer comes from the ledger exactly as before");
});

/* ---------------- (e) the gibberish repair ---------------- */

test("specimen: 'blorp. zizzle. frak.' gets the puzzled repair question, behind the joint flag", () => {
  const s = newSession();
  const [r] = run(s, ["blorp. zizzle. frak."]);
  noVerdict(r.reply);
  assert.match(r.reply, /What is that\? Gibberish\?/, "the repair asks, tentatively");
  assert.ok(r.trace.gibberishRepair, "the repair is on the trace");
  const flag = r.trace.normalcy?.flags.find((f) => f.kind === "gibberish");
  assert.ok(flag, "the gibberish flag stands behind the repair");
  assert.equal(
    flag!.strength,
    "moderate",
    "graded moderate: one token (frak) arrived as a spelling guess landing on a word of ordinary currency (frank)",
  );
  assert.ok(flag!.standing, "priced by Coherence");
  // Nothing from the guessed fragments was recorded as an
  // event or a state: the utterance carried no content.
  assert.equal(s.events.length, 0);
  assert.equal(s.states.length, 0);
});

/* ---------------- the discipline pins ---------------- */

test("discipline (i): a rare REAL word never raises gibberish — frequency grades, failure fires", () => {
  // 'abattoir' is genuinely rare (wordfreq Zipf 2.5, at the
  // filed table's floor) and entirely real: ordinary sentences
  // built on it get ordinary treatment.
  for (const line of ["I saw the abattoir.", "The abattoir is cold."]) {
    const s = newSession();
    const [r] = run(s, [line]);
    assert.equal(r.trace.normalcy, undefined, `no normalcy flag for: ${line}`);
    assert.equal(r.trace.gibberishRepair, undefined);
    noVerdict(r.reply);
  }
  // A real word the matcher can only guess at (quokka →
  // quota) likewise raises nothing: a guess is not a failure.
  const s = newSession();
  const [r] = run(s, ["I saw the quokka."]);
  assert.equal(r.trace.normalcy, undefined);
});

test("discipline (i), at the joint: an attested-but-unparsed token blocks the gibberish flag", () => {
  // The bridge's readings, exercised directly: one token
  // failed outright (blorp — unattested), one is a real word
  // this parser cannot place (abattoir — attested, unresolved).
  // The flag must NOT fire: content may have arrived.
  const s0 = newSession();
  run(s0, ["The soup is hot."]);
  const core = stripEnvelope(persons(s0)[0]);
  const mkInfo = (surface: string): InformationObject =>
    createInformationObject({ ...core, id: `obj-${surface}`, turn: 9, surface });
  const stub = (resolutions: { surface: string; outcome: "unresolved"; replacement: string[] }[]): ParsedSentence =>
    ({
      meaning: {
        nodes: [{ id: "r", lemma: "be", form: "be", syntacticElement: "Earth", role: "verb", states: { mood: "indicative" } }],
        edges: [],
        rootId: "r",
        entryElement: "Earth",
      },
      connective: { language: "en", tokens: [], next: [], spans: [] },
      realizes: {},
      scopeAttachments: [],
      tokenResolutions: resolutions.map((r, i) => ({ ...r, tokenIndex: i, confidence: 0.1, rule: "none" })),
    }) as unknown as ParsedSentence;

  const blocked = assessNormalcy(
    stub([
      { surface: "blorp", outcome: "unresolved", replacement: ["blorp"] },
      { surface: "abattoir", outcome: "unresolved", replacement: ["abattoir"] },
    ]),
    mkInfo("Blorp abattoir."),
    newSession(),
  );
  assert.ok(!blocked.some((f) => f.kind === "gibberish"), "an attested real word blocks the flag");

  const fired = assessNormalcy(
    stub([
      { surface: "blorp", outcome: "unresolved", replacement: ["blorp"] },
      { surface: "zizzle", outcome: "unresolved", replacement: ["zizzle"] },
    ]),
    mkInfo("Blorp zizzle."),
    newSession(),
  );
  const gib = fired.find((f) => f.kind === "gibberish");
  assert.ok(gib, "with every content token unattested and failed, the flag fires");
  assert.equal(gib!.strength, "strong", "outright failure everywhere grades strong");
});

test("discipline (ii): no table value sets a price — Coherence prices the KIND, identically, whatever the evidence", () => {
  // Two gibberish utterances with different failed tokens (and
  // so different frequency/familiarity evidence) draw the
  // identical priced standing: the standing is keyed to the
  // kind, and no number from either table appears in it.
  const standings = ["blorp. zizzle. frak.", "snarp. qwizzle. frone."].map((line) => {
    const s = newSession();
    const [r] = run(s, [line]);
    const flag = r.trace.normalcy?.flags.find((f) => f.kind === "gibberish");
    assert.ok(flag, `gibberish flag for: ${line}`);
    assert.equal(r.trace.pricing, undefined, "no price is fabricated from a flag");
    return flag!.standing!;
  });
  assert.equal(standings[0], standings[1], "the standing is the kind's, not the evidence's");
  assert.ok(!/\d/.test(standings[0]), "no table number stands in the priced standing");
});

/* ---------------- the wall: flags ride the envelope only ---------------- */

test("the wall: normalcy flags live on the envelope — the stripped core carries none", () => {
  const s = newSession();
  // Fixture restored (property-axes slice, 2026-11-18): C7
  // swapped the soup telling for the garden's, on the
  // since-removed cross-axis derivation; the soup telling
  // stands again and its question is record-settled as
  // before. The claim under test — flags ride the envelope
  // only — is unchanged.
  run(s, ["The soup is hot.", "Is the soup hot?", "Is winter cold?"]);
  for (const info of persons(s)) {
    const core = stripEnvelope(info) as ReturnType<typeof stripEnvelope> & { envelope?: unknown };
    assert.equal(core.envelope, undefined, "stripping removes the envelope whole");
    const coreJson = JSON.stringify({ act: core.act, content: core.content, links: core.links });
    assert.ok(!/self-redundancy|obviousness|gibberish/.test(coreJson), "no flag vocabulary in the core");
  }
  const flagged = persons(s).filter((o) => o.envelope.normalcy?.length);
  assert.equal(flagged.length, 2, "the flags stand on the two question objects' envelopes");
});

/* ---------------- the answered-earlier residual ---------------- */

test("residual, pinned as designed: a question answered earlier is priced as self-redundant but draws no said-so move in v1", () => {
  const s = newSession();
  const [t1, t2] = run(s, ["Is the salt cold?", "Is the salt cold?"]);
  assert.equal(t1.reply, "The salt is cold.");
  const flag = t2.trace.normalcy?.flags.find((f) => f.kind === "self-redundancy");
  assert.ok(flag, "the flag files — the record settles the question");
  assert.match(flag!.detail, /stands answered/, "settled by the earlier answer, not by a statement");
  assert.ok(flag!.standing, "priced");
  assert.equal(t2.trace.saidSo, undefined, "no said-so move for the answered-earlier variant in v1");
  assert.equal(t2.reply, "The salt is cold.", "the ordinary derivation answer stands");
});
