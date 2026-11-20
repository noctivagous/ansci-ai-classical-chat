/**
 * ansci-transcript-slice7.test.ts — the located decline for
 * construction gaps (Transcript Slice 7, 2026-11-19).
 *
 * The diagnosis (probe report SD4): a parser failure was
 * surfaced as "Could you put that another way?" — S4's
 * whole-utterance rephrase, which never names the failure —
 * locating the gap in the VISITOR's phrasing even when the
 * gap is the system's own construction inventory. The owner
 * ruled: a system-side CONSTRUCTION gap surfaces as a
 * LOCATED decline, not an unnamed rephrase; the rephrase
 * request stays for genuine ambiguity. That ruling amends
 * the S4 design for this class.
 *
 * The distinction is implemented at the parse-failure exit
 * (turn.ts, constructionGapOf) on the evidence the code
 * holds there, and the bar is conservative — every condition
 * must hold: a clause-machinery failure ("cannot parse
 * complement / subject / copular question / main clause /
 * condition clause / existential subject of"); every word
 * attested (the C4 attestation), no word guessed in by a
 * correction or segmentation; and a POSITIVE signature of a
 * named unbuilt construction. Where any condition fails the
 * class is undecidable in code and the rephrase stands
 * exactly as before — the controls below pin both sides.
 *
 * The signatures pinned here, each verified to stop at the
 * parser on Slice 6's head (replies recorded in the slice
 * report): (a) a clausal complement behind an intervening
 * NP — Slice 1's recorded fall-through ("tell me who i
 * am."); (b) an infinitival subject clause ("to swim is
 * fun."); (c) a whose-question ("whose dog is this?").
 *
 * The decline's wording is a minimal draft in the system's
 * established decline voice, flagged the owner's to settle.
 * No clarification pending opens on a decline: a located
 * decline is not a clarification, and the next turn is not
 * its fill.
 *
 * Every expectation was verified against this tree's build
 * before it was pinned.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";

const REPHRASE = "Could you put that another way?";
const DECLINE = "I can't take that sentence apart: its shape is one my sentence layer doesn't build yet.";

function turn(session: ReturnType<typeof newSession>, text: string) {
  return processTurn(session, text);
}

test("construction gap (a): 'tell me who i am.' draws the located decline, not the rephrase", () => {
  const s = newSession();
  const { reply, trace } = turn(s, "tell me who i am.");
  assert.equal(reply, DECLINE);
  assert.notEqual(reply, REPHRASE);
  assert.equal(trace.parseSummary, "parse failed");
  assert.equal(trace.constructionGap?.shape, "a clausal complement behind an intervening noun phrase");
  assert.equal(trace.constructionGap?.failure, "cannot parse complement of: tell me who i am.");
  assert.match(trace.constructionGap?.ground ?? "", /located at the sentence layer/);
  assert.match(trace.declineReason ?? "", /construction gap/);
  assert.match(trace.declineReason ?? "", /sentence layer/);
  assert.deepEqual(trace.mapPath, ["person", "lpu/parser"], "the walk still stops at the parser — now named as the decline's location");
  // A located decline is not a clarification: no pending
  // opens, and the next turn is processed as itself.
  assert.equal(s.conversation.pending, null);
  assert.equal(turn(s, "The soup is hot.").reply, "Ok. The soup is hot.");
});

test("construction gap (a) generalises over the report verbs and wh-words", () => {
  for (const input of ["tell me what a dog is.", "ask me who i am.", "show me who you are.", "tell me where oklahoma is."]) {
    const { reply, trace } = turn(newSession(), input);
    assert.equal(reply, DECLINE, input);
    assert.equal(trace.constructionGap?.shape, "a clausal complement behind an intervening noun phrase", input);
  }
});

test("construction gap (b): an infinitival subject clause draws the located decline", () => {
  const { reply, trace } = turn(newSession(), "to swim is fun.");
  assert.equal(reply, DECLINE);
  assert.equal(trace.constructionGap?.shape, "an infinitival subject clause");
  assert.equal(trace.constructionGap?.failure, "cannot parse subject of: to swim is fun.");
});

test("construction gap (c): a whose-question draws the located decline", () => {
  const { reply, trace } = turn(newSession(), "whose dog is this?");
  assert.equal(reply, DECLINE);
  assert.equal(trace.constructionGap?.shape, "a whose-question");
});

test("controls: unknown words and garble keep the rephrase exactly", () => {
  for (const input of ["Frobnicate the zanzibar splunge.", "Blorf wizzle snarp.", "She acted in a film in blorpt."]) {
    const s = newSession();
    const { reply, trace } = turn(s, input);
    assert.equal(reply, REPHRASE, input);
    assert.equal(trace.constructionGap, undefined, input);
  }
  // The rephrase still opens its clarification pending, as
  // S4 designed — only the construction class leaves that
  // path.
  const s = newSession();
  turn(s, "Frobnicate the zanzibar splunge.");
  assert.equal(s.conversation.pending?.kind, "clarification");
  assert.equal(s.conversation.pending?.point, "utterance");
});

test("controls: fragments and undecidable failures keep the rephrase", () => {
  // Each of these fails at the parser (or the token exit)
  // with every word attested, but carries no positive
  // signature of a named unbuilt construction: a truncated
  // copular, a copular question with no complement, a lone
  // subordinate clause, a verbless fragment, and a no-verb
  // failure the code cannot tell apart from garble. The
  // class is undecidable in code, so the rephrase stands —
  // recorded plainly in the slice report, not faked.
  for (const input of ["the dog is", "is the dog", "who the dog is", "and then", "show the dog to me.", "tell me the dog is"]) {
    const { reply, trace } = turn(newSession(), input);
    assert.equal(reply, REPHRASE, input);
    assert.equal(trace.constructionGap, undefined, input);
  }
});

test("boundary: the that-less complement never reaches this exit (Slice 1's recorded edge)", () => {
  // "i think you are here." does not stop at the parser: it
  // silently misparses (rooted on 'here', 'think' gone), as
  // Slice 1's report recorded. A parse-failure distinction
  // cannot see it, and this slice does not pretend to: its
  // behaviour is unchanged, and no decline is filed.
  const { reply, trace } = turn(newSession(), "i think you are here.");
  assert.equal(reply, "Ok. Noted.");
  assert.equal(trace.constructionGap, undefined);
});

test("controls: the Slice 0–6 acceptance replies stand (probes 5, 6, 20 and the know family)", () => {
  assert.equal(
    turn(newSession(), "what can you do?").reply,
    "I can talk over simple statements and questions. I remember what this conversation has established. " +
      "I can explain what I based an answer on, in plain terms. My knowledge is small and fixed.",
  );
  assert.equal(
    turn(newSession(), "who are you?").reply,
    "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, " +
      "and I answer from what I know, saying so when I don't.",
  );
  assert.equal(turn(newSession(), "how are you?").reply, "I am fine.");
  assert.equal(turn(newSession(), "do you know who i am?").reply, "No. You have not told me who you are.");
  assert.equal(turn(newSession(), "do you know my name?").reply, "No. You have not told me your name.");
  assert.equal(
    turn(newSession(), "what do you know about dogs?").reply,
    "I can't answer that from what I know: nothing you have told me says what was known about dogs.",
  );
  assert.equal(turn(newSession(), "your last name is smith.").reply, "I have only the one name, AnSci.");
});
