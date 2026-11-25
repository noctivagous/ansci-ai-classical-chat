/**
 * ansci-probe2-slice2.test.ts — the answer-soundness guard
 * (Probe-2 Slice 2, 2026-11-20; diagnostic SD3).
 *
 * The diagnosis these tests pin: no validation existed
 * anywhere between planner and generator that a declarative
 * answer's value is resolved content rather than the
 * question word itself. The vacuous completion ("The
 * weather is what." — the second transcript's worst turn)
 * was unreachable in probe #2's Family V only because two
 * earlier interceptions happened to fire first on those
 * inputs; nothing mechanical stood at the seam itself.
 *
 * The guard: generate.ts's unsoundAnswerValue inspects a
 * reply graph (declarative graphs only — interrogative
 * graphs legitimately hold their question word); plan.ts's
 * checked generation (generateAnswer) refuses an unsound
 * graph at the planner→generator seam for every
 * answer-producing plan at once; turn.ts's one wrapper
 * converts the refusal into a decline located at the
 * unfilled value.
 *
 * Acceptance shape, stated honestly: on this main no live
 * visitor input reaches the guard — the interceptions
 * shadow it, as diagnosed — so the previously-shadowed case
 * is CONSTRUCTED at the seam: a plan asked to predicate the
 * question word itself, which is the exact graph the
 * transcript's build evidently composed and spoke. The
 * Family V pins below are the no-regression side: the
 * shadowed paths behave byte-identically and the guard
 * does not misfire on them.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { PLACE } from "../src/ansci/place";
import { parse } from "../src/ansci/parse";
import { generate, unsoundAnswerValue } from "../src/ansci/generate";
import { planPredication, planRecordPredication, UnsoundAnswerError } from "../src/ansci/plan";

test("inspection: a sound declarative graph passes", () => {
  const parsed = parse("the weather is cold.", "en");
  assert.equal(unsoundAnswerValue(parsed), undefined);
  assert.equal(generate(parsed), "The weather is cold.");
});

test("inspection: an interrogative graph is exempt — it legitimately holds its question word", () => {
  const parsed = parse("what is the weather?", "en");
  assert.equal(unsoundAnswerValue(parsed), undefined);
});

test("inspection: a declarative graph whose value is the question word is unsound", () => {
  const parsed = parse("the weather is cold.", "en");
  const quality = parsed.meaning.nodes.find((n) => n.lemma === "cold")!;
  quality.lemma = "what";
  quality.form = "what";
  (quality as { questionWord?: boolean }).questionWord = true;
  const unsound = unsoundAnswerValue(parsed);
  assert.equal(unsound?.lemma, "what");
});

test("seam: planPredication refuses to predicate the question word itself", () => {
  assert.throws(
    () =>
      planPredication({
        subject: { lemma: "weather", form: "weather", det: "the" },
        qualityLemma: "what",
        derivationPath: "constructed for the guard's acceptance (Probe-2 Slice 2)",
        support: 1,
        weakestTier: "attested",
      }),
    (err: unknown) => err instanceof UnsoundAnswerError && err.value.lemma === "what",
  );
});

test("seam: planPredication with a real quality composes as before", () => {
  const outcome = planPredication({
    subject: { lemma: "winter", form: "winter" },
    qualityLemma: "cold",
    derivationPath: "constructed control (Probe-2 Slice 2)",
    support: 1,
    weakestTier: "attested",
  });
  assert.equal(outcome.kind, "graph");
  if (outcome.kind === "graph") assert.match(outcome.sentence, /cold/);
});

test("seam: planRecordPredication refuses a question-word state", () => {
  assert.throws(
    () => planRecordPredication({ subject: { lemma: "you", form: "you" }, stateLemma: "what" }),
    (err: unknown) => err instanceof UnsoundAnswerError,
  );
});

test("Family V regression: the shadowed paths are byte-identical and the guard does not misfire", () => {
  // Four pins below were superseded by Probe-2 Slice 4 (the
  // unanchored-definite scope correction), which owns those
  // replies now: the two 'now' misfires, "the date", and the
  // capital-of question no longer end at the referent branch.
  // They are pinned at their Slice 4 replies; the guard
  // assertion (answerGuard unset) is this test's own and
  // still applies to every entry.
  const expected: Record<string, string> = {
    // Superseded by Probe-2 Slice 7 (the dictionary shape),
    // which owns this reply now: 'real' is unclassified and
    // the dictionary holds ordinary noun senses for it, so
    // the question answers from the dictionary instead of
    // declining. Superseded again by the Slice 7 amendment
    // (the owner's listing ruling): the three ordinary
    // senses are listed, not answered by the first (the
    // coin). The guard assertion below is unchanged and
    // still applies.
    "what is real?":
      "Real has 3 senses in my dictionary: (1) an old small silver Spanish coin; (2) the basic unit of " +
      "money in Brazil; equal to 100 centavos; (3) any rational or irrational number.",
    // Superseded again by Probe-2 Slice 6 (the weather
    // shape), which owns this reply now: with no place
    // standing, it names the place gap.
    "what is the weather now?":
      "I don't know where you are, so I can't say what the weather is like there.",
    "what is happiness?": "I can't answer that from what I know: I have no way to connect anything to 'what'.",
    "what is the answer?": "What answer? You just started talking.",
    // Superseded again by Probe-2 Slice 5 (the time/date
    // frame shape), which owns both replies now: frame-less,
    // they decline located at the missing clock reading.
    "what is the time now?":
      "I can't answer that from what I know: this conversation has no clock reading — I wasn't given the time when we started.",
    "what is the date?":
      "I can't answer that from what I know: this conversation has no clock reading — I wasn't given the date when we started.",
    "who is the president?": "What president? You just started talking.",
    "what is the capital of oklahoma?":
      "I can't answer that from what I know: I have capital in my notes as a book written by Karl Marx (1867) describing his economic theories, but nothing that connects it to 'what', and I have no way to connect anything to 'what'.",
  };
  // The weather pin stands under no configured seat (the
  // default seat is Oklahoma City, OK now).
  const savedSeat = PLACE.place;
  PLACE.place = null;
  try {
    for (const [input, reply] of Object.entries(expected)) {
      const result = processTurn(newSession(), input);
      assert.equal(result.reply, reply, input);
      assert.equal(result.trace.answerGuard, undefined, `guard must not misfire on '${input}'`);
    }
  } finally {
    PLACE.place = savedSeat;
  }
});
