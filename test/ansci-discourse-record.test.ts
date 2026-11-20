/**
 * ansci-discourse-record.test.ts — the Discourse Record reader
 * (awareness/discourse-record; the discourse/uptake programme,
 * Design 1, 2026-11-19).
 *
 * The reader is a pure derivation over the session ledgers:
 * these tests build sessions by hand (records pushed in the
 * recording flow's own shapes, supersessions made through
 * session.ts's own helpers) and pin the servings — histories
 * complete and ordered, movements exact, salience with its
 * derivation, open threads owed by nobody — and the audit:
 * every served pointer resolves to the ledger record it names.
 *
 * Salience determination (owner ruling 5; recorded in the
 * module header and GAPS.md): standing-ness gates; recurrence
 * +1.0 per history item; recency +2.0 × 1/(1 + age).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newSession,
  recordEntity,
  supersedeRecord,
  supersedeState,
  type Session,
  type StateRecord,
} from "../src/ansci/session";
import {
  eventTimeline,
  openThreads,
  rankedTopics,
  resolvePointer,
  salienceOf,
  stateMovements,
  stateTimeline,
  topicHistories,
  topicHistory,
} from "../src/ansci/discourse-record";

function state(holder: string, lemma: string, turn: number, extra: Partial<StateRecord> = {}): StateRecord {
  const out: StateRecord = { holder, lemma, turn, origin: { kind: "parsed" }, ...extra };
  return out;
}

/** The P-036 shape, hand-built: a leg, injured, weightlifting
 *  stopped over it, across turns 2–5. */
function legSession(): Session {
  const s = newSession();
  recordEntity(s, "leg", 2);
  s.events.push({ verb: "hurt", agent: "you", patient: "leg", turn: 2, text: "I hurt my leg" });
  s.states.push(state("leg", "sore", 2));
  recordEntity(s, "leg", 4);
  s.events.push({ verb: "stop", agent: "you", theme: "weightlifting", turn: 4, text: "I stopped weightlifting" });
  // The weightlifting event mentions the leg only through the
  // telling; a second event names it directly:
  s.events.push({ verb: "rest", agent: "you", theme: "leg", turn: 5, text: "I am resting my leg" });
  recordEntity(s, "leg", 5);
  return s;
}

test("DR-1: a topic history carries its events and standing states, sequenced, with pointers that audit", () => {
  const s = legSession();
  const h = topicHistory(s, "leg");
  assert.ok(h);
  assert.equal(h.raisedTurn, 2);
  assert.equal(h.lastTouchedTurn, 5);
  assert.deepEqual(
    h.items.map((i) => [i.kind, i.turn]),
    [
      ["event", 2],
      ["state", 2],
      ["event", 5],
    ],
  );
  // The audit: every pointer resolves to the record it names.
  for (const item of h.items) {
    const resolved = resolvePointer(s, item.pointer) as { turn: number };
    assert.equal(resolved.turn, item.turn, `pointer ${item.pointer.ledger}:${item.pointer.index} audits to its record`);
  }
  assert.equal((resolvePointer(s, h.topicPointer) as { lemma: string }).lemma, "leg");
  assert.equal(h.standing, true);
  assert.equal(h.standingStates.length, 1);
  assert.equal(h.standingStates[0].state.lemma, "sore");
});

test("DR-1: superseded states are recovered from the deltas into the history", () => {
  const s = newSession();
  recordEntity(s, "soup", 1);
  s.states.push(state("soup", "hot", 1, { element: "Fire" }));
  supersedeState(s, state("soup", "hot", 3, { element: "Fire", negated: true }));
  const h = topicHistory(s, "soup");
  assert.ok(h);
  const superseded = h.items.filter((i) => i.kind === "superseded-state");
  assert.equal(superseded.length, 1);
  assert.equal(superseded[0].state?.lemma, "hot");
  assert.equal(superseded[0].state?.negated, undefined, "the recovered state is the one that stood, before its replacement");
  assert.equal(superseded[0].pointer.ledger, "supersession");
  assert.equal((resolvePointer(s, superseded[0].pointer) as { replaced: StateRecord }).replaced.lemma, "hot");
  // The replacement stands in the states ledger and is served
  // as the topic's standing state.
  assert.equal(h.standingStates.length, 1);
  assert.equal(h.standingStates[0].state.negated, true);
});

test("DR-1: standing-ness gates salience — a topic superseded away entirely scores zero and opens no thread", () => {
  const s = newSession();
  recordEntity(s, "plan", 1);
  const standing = state("plan", "ready", 1);
  s.states.push(standing);
  // A correction removes the state and replaces it under a
  // different holder's record — nothing of 'plan' stands, and
  // no event mentions it.
  supersedeRecord(s, standing, state("you", "unsure", 2));
  const sal = salienceOf(s, "plan", 5);
  assert.ok(sal);
  assert.equal(sal.standing, false);
  assert.equal(sal.score, 0);
  assert.equal(openThreads(s, 5).some((t) => t.lemma === "plan"), false);
});

test("DR-1: salience serves its derivation — recurrence the spine, recency the bounded bonus", () => {
  const s = legSession();
  const sal = salienceOf(s, "leg", 5);
  assert.ok(sal);
  assert.equal(sal.items, 3);
  assert.equal(sal.age, 0);
  assert.equal(sal.recency, 2);
  assert.equal(sal.score, 5);
  const later = salienceOf(s, "leg", 9);
  assert.ok(later);
  assert.equal(later.age, 4);
  assert.equal(later.recency, 2 / 5);
  assert.equal(later.score, 3 + 2 / 5, "an old recurrent topic keeps its recurrence; only the bonus decays");
});

test("DR-1: rankings are deterministic and open threads exclude the current turn's topic", () => {
  const s = legSession();
  recordEntity(s, "exam", 3);
  s.events.push({ verb: "pass", agent: "you", theme: "exam", turn: 3, text: "I passed the exam" });
  recordEntity(s, "exam", 6);
  const ranked = rankedTopics(s, 6);
  assert.deepEqual(ranked.map((r) => r.lemma), ["leg", "exam"], "recurrence outranks a fresher single mention");
  const threads = openThreads(s, 6);
  assert.deepEqual(threads.map((t) => t.lemma), ["leg"], "the topic touched this turn is the turn's own business, not a thread");
  // The spine audits: first item, latest event, standing states.
  for (const p of threads[0].spine) assert.ok(resolvePointer(s, p) !== undefined);
});

test("DR-1: movements are chains — links join, the head stands, pointers audit", () => {
  const s = newSession();
  s.states.push(state("you", "worried", 1, { element: "Metal" }));
  supersedeState(s, state("you", "worried", 2, { element: "Metal", negated: true }));
  supersedeState(s, state("you", "worried", 3, { element: "Metal" }));
  // Then replaced by a different lemma through the record-keyed
  // helper (a restatement): worried → calm.
  const calm = state("you", "calm", 4, { element: "Earth" });
  const standingWorried = s.states.find((x) => x.lemma === "worried" && !x.negated);
  assert.ok(standingWorried);
  supersedeRecord(s, standingWorried, calm);
  const movements = stateMovements(s, "you");
  assert.equal(movements.length, 1, "the three deltas form ONE movement, not three");
  const m = movements[0];
  assert.equal(m.links.length, 3);
  assert.deepEqual(
    m.links.map((l) => [l.from.lemma, l.from.negated === true, l.to.lemma, l.to.negated === true]),
    [
      ["worried", false, "worried", true],
      ["worried", true, "worried", false],
      ["worried", false, "calm", false],
    ],
  );
  assert.equal(m.head?.state.lemma, "calm");
  for (const link of m.links) {
    const delta = resolvePointer(s, link.pointer) as { replaced: StateRecord; replacing: StateRecord };
    assert.equal(delta.replaced, link.from);
    assert.equal(delta.replacing, link.to);
  }
  assert.equal((resolvePointer(s, m.head!.pointer) as StateRecord).lemma, "calm");
});

test("DR-1: the state timeline serves standing and superseded states under one predicate, in order", () => {
  const s = newSession();
  s.states.push(state("you", "sad", 1, { element: "Metal" }));
  supersedeState(s, state("you", "sad", 3, { element: "Metal", negated: true }));
  s.states.push(state("you", "glad", 4, { element: "Fire" }));
  const timeline = stateTimeline(s, "you", (x) => x.element !== undefined);
  assert.deepEqual(
    timeline.map((i) => [i.state.lemma, i.turn, i.standing]),
    [
      ["sad", 1, false],
      ["sad", 3, true],
      ["glad", 4, true],
    ],
  );
  for (const item of timeline) assert.ok(resolvePointer(s, item.pointer) !== undefined);
});

test("DR-1: histories cover every recorded topic, and an unknown topic serves nothing", () => {
  const s = legSession();
  assert.deepEqual(topicHistories(s).map((h) => h.lemma), ["leg"]);
  assert.equal(topicHistory(s, "spaceship"), undefined);
  assert.equal(salienceOf(s, "spaceship", 5), undefined);
});

test("DR-1: the event timeline serves one agent's events in turn order, pointers auditing", () => {
  const s = legSession();
  const timeline = eventTimeline(s, "you");
  assert.deepEqual(
    timeline.map((i) => i.event.verb),
    ["hurt", "stop", "rest"],
  );
  for (const item of timeline) {
    assert.equal(resolvePointer(s, item.pointer), item.event);
  }
  assert.deepEqual(eventTimeline(s, "sister"), []);
});
