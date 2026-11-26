/**
 * ansci-volvelle-acts.test.ts — the volvelle build, slice 1:
 * the wider speech-act reading on the assessed object.
 *
 * SemanticAssessment (assess.ts) now names the Ring-1 act an
 * utterance performs (act.speechAct) beside the kind it has
 * always assigned, and the functional family the act falls
 * under (act.turnFamily: a Statement supplies something, a
 * Request solicits something not given). The kind is untouched
 * — the last test pins the pre-existing kinds against the same
 * utterances. Detectors read only material the parse carries;
 * each act is pinned on at least two utterances that parse
 * today, plus the negative controls the precedence rules name.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import type { SemanticObject } from "../src/ansci/semantic-object";

/** The person object a single utterance, said first, assesses to. */
function assessed(surface: string): SemanticObject {
  const s: Session = newSession();
  processTurn(s, surface);
  const o = s.objects.find((x) => x.producer === "person");
  assert.ok(o, `no person object for: ${surface}`);
  return o;
}

test("directive: a non-telling imperative is named a directive, in the request family", () => {
  for (const surface of ["Bring me the book.", "Show me the garden."]) {
    const o = assessed(surface);
    assert.equal(o.act.speechAct, "directive", surface);
    assert.equal(o.act.turnFamily, "request", surface);
  }
});

test("request: a telling with its matter named is a request, in either dress", () => {
  for (const surface of ["Tell me about the garden.", "Can you tell me about the garden?"]) {
    const o = assessed(surface);
    assert.equal(o.act.speechAct, "request", surface);
    assert.equal(o.act.turnFamily, "request", surface);
  }
});

test("offer: the offer of help is an offer, in question dress and declarative dress alike", () => {
  for (const surface of ["Can I help you?", "I can help you."]) {
    const o = assessed(surface);
    assert.equal(o.act.speechAct, "offer", surface);
    assert.equal(o.act.turnFamily, "statement", surface);
  }
});

test("uncertainty: a hedged saying is named uncertainty, a statement-family act", () => {
  for (const surface of ["I think the soup is hot.", "The soup might be hot.", "I am not sure."]) {
    const o = assessed(surface);
    assert.equal(o.act.speechAct, "uncertainty", surface);
    assert.equal(o.act.turnFamily, "statement", surface);
    assert.equal(o.act.kind, "statement", surface);
  }
});

test("exclamation: a statement in exclamatory dress is an exclamation", () => {
  for (const surface of ["The soup is wonderful!", "The garden is large!"]) {
    const o = assessed(surface);
    assert.equal(o.act.speechAct, "exclamation", surface);
    assert.equal(o.act.kind, "statement", surface);
  }
});

test("concern: a feeling predicated of the speaker is a concern; of another, a statement", () => {
  for (const surface of ["I am sad.", "I feel sad."]) {
    const o = assessed(surface);
    assert.equal(o.act.speechAct, "concern", surface);
    assert.equal(o.act.turnFamily, "statement", surface);
  }
  assert.equal(assessed("Sam is sad.").act.speechAct, "statement");
});

test("proposition: a topic proposed and a wondering posed are propositions", () => {
  const topic = assessed("What about coffee?");
  assert.equal(topic.act.kind, "topic-proposal");
  assert.equal(topic.act.speechAct, "proposition");
  const wondering = assessed("I wonder whether I can enjoy the life insurance.");
  assert.equal(wondering.act.speechAct, "proposition");
});

test("affirmation and negation: the bare polar answers, and a negated statement", () => {
  assert.equal(assessed("Yes.").act.speechAct, "affirmation");
  assert.equal(assessed("No.").act.speechAct, "negation");
  const negated = assessed("The soup is not hot.");
  assert.equal(negated.act.speechAct, "negation");
  assert.equal(negated.act.kind, "statement");
});

test("the ritual and question acts keep their own names", () => {
  assert.equal(assessed("Hello.").act.speechAct, "greeting");
  assert.equal(assessed("Thank you.").act.speechAct, "thanks");
  assert.equal(assessed("Goodbye.").act.speechAct, "leave-taking");
  assert.equal(assessed("Who are you?").act.speechAct, "self-query");
  assert.equal(assessed("Why?").act.speechAct, "reason-query");
  const q = assessed("Is the soup hot?");
  assert.equal(q.act.speechAct, "question");
  assert.equal(q.act.turnFamily, "request");
  const st = assessed("The soup is hot.");
  assert.equal(st.act.speechAct, "statement");
  assert.equal(st.act.turnFamily, "statement");
});

test("regression: the kinds the loop has always assigned are unchanged", () => {
  const kinds: [string, string][] = [
    ["The soup is hot.", "statement"],
    ["Is the soup hot?", "question"],
    ["Hello.", "greeting"],
    ["Thank you.", "thanks"],
    ["Goodbye.", "leave-taking"],
    ["Who are you?", "self-query"],
    ["Why?", "reason-query"],
    ["What about coffee?", "topic-proposal"],
    ["Bring me the book.", "statement"],
    ["I am sad.", "statement"],
    ["The soup is not hot.", "statement"],
  ];
  for (const [surface, kind] of kinds) {
    assert.equal(assessed(surface).act.kind, kind, surface);
  }
});
