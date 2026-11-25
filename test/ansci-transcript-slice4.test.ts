/**
 * ansci-transcript-slice4.test.ts — the where-question split
 * (Transcript Slice 4, 2026-11-19): the three where-questions
 * take three distinct paths.
 *
 * The diagnosis these tests pin (probe report §2, SD2): no
 * code distinguished self-location from world-location.
 * SemanticAssessment's self-query recognition required a
 * predicated-as edge with a who/what question word, so a
 * where-question (a location relation) was never recognised
 * as self-directed; the Awareness frame holds month/day/
 * hour, season, daypart — no place field at all; and the two
 * decline texts the probes met split by an accidental
 * nameable-subject check, not by self vs world. Probes 12
 * and 13 ("where are you?", "where am i?") and 15 ("where is
 * a dog?") all drew the question-shape decline; probe 11
 * ("where is oklahoma?") declined while naming what Slice
 * 0's grounding holds. Every expectation below was verified
 * against this tree's build before it was pinned.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { requestPlace } from "../src/ansci/social";
import { PLACE } from "../src/ansci/place";

/** Run with no configured seat: the place-gap machinery's
 *  standing (the default seat is Oklahoma City, OK now). */
function withNoSeat<T>(fn: () => T): T {
  const saved = PLACE.place;
  PLACE.place = null;
  try {
    return fn();
  } finally {
    PLACE.place = saved;
  }
}

const SHAPE_TEXT = "this question shape is not one the net can answer yet";
const SHAPE_REPLY = "I answer questions about what things are like, and that one asks something else";
// MINIMAL / DRAFT wording (Slice 4): the mechanism's
// truthful forms only — the Place table stands
// unconfigured, so the self-location reply is the located
// decline naming self-location as the gap. The final
// visitor-facing wording is the owner's to settle.
const SELF_LOCATION_TEXT = "I don't have a place: nothing in my situation record says where I am.";
const VISITOR_LOCATION_TEXT = "I have no way of knowing where you are.";
const OKLAHOMA_TEXT = "Oklahoma is a state in south central United States.";
const IDENTITY_TEXT =
  "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't.";

function turn(session: ReturnType<typeof newSession>, text: string) {
  return processTurn(session, text);
}

function person(session: ReturnType<typeof newSession>) {
  return session.objects.filter((o) => o.producer === "person");
}

test("the Place table's standing configuration: the default seat is Oklahoma City, OK", () => {
  // Self-location's home is a Place entry in Awareness
  // Self's tables (deployment configuration, like
  // Identity/Capabilities); its standing content is the
  // default seat, Oklahoma City, OK, unless a deployment
  // overrides it. The self-location decline below is
  // composed under no seat (withNoSeat).
  assert.equal(requestPlace().place, "Oklahoma City, OK");
});

test("probe 11: 'where is oklahoma?' answers at gloss level from the grounded entity record", () => {
  const session = newSession();
  const { reply, trace } = turn(session, "where is oklahoma?");
  assert.equal(reply, OKLAHOMA_TEXT);
  assert.equal(trace.declineReason, undefined, "no decline: the held gloss answers at its level");
  // Provenance visible in the trace: the synset and its
  // wordnet-retrieved provenance ride on the entity answer.
  assert.equal(trace.entityAnswer?.subject, "oklahoma");
  assert.equal(trace.entityAnswer?.synsetId, "wn-n09295833");
  assert.match(trace.entityAnswer?.ground ?? "", /wordnet-retrieved/);
  assert.match(trace.planNote ?? "", /grounded entity record/);
  // The world share is not a self-query.
  assert.equal(person(session)[0].act.kind, "question");
});

test("probe 12: 'where are you?' takes the self-location path — a decline naming self-location as the gap", () => {
  const session = newSession();
  const { reply, trace } = withNoSeat(() => turn(session, "where are you?"));
  // Recognised as self-directed in assessment: a self-query
  // of the location flavour.
  assert.equal(person(session)[0].act.kind, "self-query");
  assert.equal(person(session)[0].act.selfQuery, "location");
  // The Place table stands unconfigured, so the answer is
  // the located decline naming self-location — never the
  // question-shape text.
  assert.equal(reply, SELF_LOCATION_TEXT);
  assert.ok(!reply.includes(SHAPE_REPLY), "the shape reply must not appear");
  assert.match(trace.declineReason ?? "", /self-location/);
  assert.ok(!(trace.declineReason ?? "").includes(SHAPE_TEXT), "the shape decline must not appear");
});

test("probe 13: 'where am i?' takes the visitor-location form in a fresh session", () => {
  const session = newSession();
  const { reply, trace } = turn(session, "where am i?");
  assert.equal(person(session)[0].act.kind, "question");
  assert.equal(person(session)[0].act.visitorLocation, true);
  assert.equal(reply, VISITOR_LOCATION_TEXT);
  assert.ok(!reply.includes(SHAPE_REPLY), "the shape reply must not appear");
  assert.match(trace.declineReason ?? "", /visitor's location/);
  assert.ok(!(trace.declineReason ?? "").includes(SHAPE_TEXT), "the shape decline must not appear");
});

test("probe 13, established: a location the conversation itself established answers from the record", () => {
  const session = newSession();
  turn(session, "i live in paris.");
  const { reply, trace } = turn(session, "where am i?");
  assert.equal(reply, "You told me you live in Paris.");
  assert.equal(trace.declineReason, undefined, "no decline: the record answers");
  assert.equal(trace.recordAnswer?.source, "event");
  assert.equal(trace.recordAnswer?.event?.filler, "paris");
});

test("probe 15: 'where is a dog?' declines located at the subject", () => {
  const session = newSession();
  const { reply, trace } = turn(session, "where is a dog?");
  assert.equal(reply, "I can't answer that from what I know: nothing in what I know says where a dog is.");
  assert.ok(!reply.includes(SHAPE_REPLY), "the shape reply must not appear");
  assert.match(trace.declineReason ?? "", /located at the subject/);
  assert.match(trace.declineReason ?? "", /'dog'/);
  assert.equal(trace.entityAnswer, undefined, "a kind is not a grounded entity");
});

test("the world path is general: another grounded place answers, an ungrounded name declines at itself", () => {
  const paris = turn(newSession(), "where is paris?");
  assert.match(paris.reply, /^Paris is the capital and largest city of France/);
  assert.equal(paris.trace.entityAnswer?.subject, "paris");
  const atlantis = turn(newSession(), "where is atlantis?");
  assert.equal(
    atlantis.reply,
    "I can't answer that from what I know: nothing in what I know says where atlantis is.",
  );
  assert.match(atlantis.trace.declineReason ?? "", /nothing on the subject is held at all/);
});

test("the time-frame forms route by their real subject, not the mis-headed time word", () => {
  // The parse heads a trailing time word as the subject,
  // the real subject standing as its qualifier; the split
  // reads the subject through the qualifier.
  assert.equal(withNoSeat(() => turn(newSession(), "where are you now?")).reply, SELF_LOCATION_TEXT);
  assert.equal(
    turn(newSession(), "where is the dog now?").reply,
    "I can't answer that from what I know: nothing in what I know says where the dog is.",
  );
  assert.equal(turn(newSession(), "where is oklahoma now?").reply, OKLAHOMA_TEXT);
});

test("the verb-carried where-forms keep their owners (C3 self-fact shapes)", () => {
  assert.equal(turn(newSession(), "where do you live?").reply, "I don't have a home.");
  assert.equal(turn(newSession(), "where were you born?").reply, "I don't have a birthplace.");
});

test("controls unchanged: probes 5, 6, 14, 20 and the Slice 2 know-where path", () => {
  const cases: [string, string][] = [
    ["what can you do?", "I can talk over simple statements and questions. I remember what this conversation has established. I can explain what I based an answer on, in plain terms. My knowledge is small and fixed."],
    ["who are you?", IDENTITY_TEXT],
    ["what is oklahoma?", OKLAHOMA_TEXT],
    ["how are you?", "I am fine."],
    // Slice 2's routing of the know-complement where-form is
    // untouched: it keeps its decline located at the embedded
    // subject, naming what is held.
    [
      "do you know where oklahoma is?",
      "I can't answer that from what I know: I have oklahoma as a state in south central United States, but nothing in what I know answers that.",
    ],
  ];
  for (const [input, expected] of cases) {
    assert.equal(turn(newSession(), input).reply, expected, input);
  }
});
