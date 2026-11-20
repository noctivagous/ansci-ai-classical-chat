/**
 * ansci-turn.test.ts — Slice C: the turn loop and session.
 *
 * Pins the transcript gate's disciplines (§5.1) at unit level: state
 * persists across turns, replies are steered by named cycle paths that
 * the trace records, questions are answered from derivation paths,
 * unanswerable questions decline naming what's missing, pronouns
 * resolve by recency, and the ontology is never named on the surface.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn, type TurnResult } from "../src/ansci/turn";
import { SCENARIOS } from "../src/ansci/scenarios";

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}

/** The surface ban: element/polarity/cycle vocabulary in replies. */
const LEAK = /\b(wood|fire|earth|metal|wuxing|yin|yang|element|elements|five elements)\b/i;

test("anger scenario: state persists across turns and steering follows the cycles", () => {
  const s = newSession();
  const [t1, t2, t3] = run(s, SCENARIOS[0].turns);
  // Turn 1's event is still in the situation at turn 3.
  assert.equal(s.events[0].verb, "hear");
  assert.equal(s.events[0].patient, "news");
  assert.ok(s.states.some((st) => st.lemma === "furious" && st.element === "Wood"));
  assert.equal(s.events.length, 2, "both events recorded");
  // Turn 2's reply takes up turn 1's event — cross-turn reference.
  assert.match(t2.reply, /heard the news/);
  assert.equal(t2.trace.cyclePath, "Wood→Fire (generating)", "anger followed in the generating direction, toward expression");
  // Turn 3 vents the state; the reply is steered from the restraining side.
  assert.equal(t3.trace.cyclePath, "Metal→Wood (controlling)");
  assert.match(t3.reply, /shouted at him/);
  assert.ok(t1.trace.steeringNote, "the pure event turn says why no cycle steered it");
});

test("worry/sleep scenario: the controlling arc addresses the restrainer", () => {
  const s = newSession();
  const [, t2] = run(s, SCENARIOS[1].turns);
  assert.equal(t2.trace.cyclePath, "Earth→Water (controlling)", "worry (Earth) restrains sleep (Water) — the reply addresses the worry");
  assert.match(t2.reply, /couldn't sleep/);
  assert.match(t2.reply, /worry about/);
});

test("winter scenario: questions answered from the derivation path", () => {
  const s = newSession();
  const [t1, t2, t3] = run(s, SCENARIOS[2].turns);
  assert.match(t1.trace.derivationPath ?? "", /winter —ELEMENT_OF→ Water/);
  assert.match(t1.reply, /Winter is cold/);
  assert.match(t2.trace.derivationPath ?? "", /summer —ELEMENT_OF→ Fire/);
  // R1.5: this turn's origin changed (probe degree-profile
  // rendering → the planner's generated reply graph), so the
  // reply is now the generator's sentence — capitalised
  // sentence-initially and carrying the degree as a modulator
  // ("Summer is most fully hot."). The old case-sensitive
  // /summer is hot/ match cannot survive a generated sentence;
  // it is replaced by the generated form, per T-R1.5-results.md.
  assert.match(t2.reply, /Summer is most fully hot/);
  assert.match(t3.reply, /Winter is dark/);
});

test("soup scenario: pronoun 'it' resolves to the soup by recency", () => {
  const s = newSession();
  const [, t2, t3] = run(s, SCENARIOS[3].turns);
  assert.deepEqual(t2.trace.resolutions, [{ pronoun: "it", resolvedTo: "soup" }]);
  assert.match(t2.reply, /soup needs more salt/);
  assert.match(t2.trace.derivationPath ?? "", /salty/, "the follow-up comes from salt's taste correspondence");
  // RE-PIN (the Normalcy arc, Part 3c): turn 3 ("I put the
  // salt in the soup.") is a fully specified telling and now
  // gets the plain acknowledgement — was the steering echo
  // "You put the salt in the soup. What goes in next?". The
  // event itself stands recorded with its roles filled,
  // which is what the echo used to show.
  // RE-PIN (the recognition programme, R2, 2026-11-19): the
  // acknowledgement is now the recognition receipt — it
  // shows the recorded event, the very thing the old echo
  // showed, without the steering question. The pronoun
  // resolution this test pins is unchanged.
  // RE-PIN (the X programme, X1, 2026-11-19): the receipt now
  // appends the one link the record holds — turn 2's telling
  // ("It needs more salt.", 'it' resolved to the soup by the
  // resolution pinned above) recorded a NEED event over the
  // salt, a different event from this turn's PUT sharing the
  // content lemma 'salt', so it is not the re-telling X1
  // excepts: the link renders that earlier event under
  // attribution ("You told me the soup needed the salt.").
  // The pronoun resolution this test pins is unchanged.
  assert.equal(t3.reply, "Ok. You put the salt in the soup. You told me the soup needed the salt.");
  const put = s.events[s.events.length - 1];
  assert.equal(put.verb, "put");
  assert.equal(put.theme, "salt");
  assert.equal(put.location, "soup");
});

test("decline: a why-question with no causal path declines in shape, naming what's missing", () => {
  const s = newSession();
  const r = processTurn(s, "Why is the ladder big?");
  assert.ok(r.trace.declineReason);
  assert.match(r.reply, /can't answer/);
  assert.match(r.reply, /ladder/, "the missing piece is named");
});

test("leakage scan: no reply in any scenario names the ontology", () => {
  for (const scenario of SCENARIOS) {
    const s = newSession();
    for (const r of run(s, scenario.turns)) {
      assert.ok(!LEAK.test(r.reply), `reply leaks ontology vocabulary: ${r.reply}`);
      assert.ok(!/^\s*(you\s+)?(Noctivagous|friend|user)\b/i.test(r.reply), "no name vocatives");
    }
  }
  const s = newSession();
  assert.ok(!LEAK.test(processTurn(s, "Why is the ladder big?").reply), "declines are clean too");
});

test("trace completeness: every bot turn names a cycle path, a derivation, or a reason", () => {
  for (const scenario of SCENARIOS) {
    const s = newSession();
    for (const r of run(s, scenario.turns)) {
      const t = r.trace;
      assert.ok(
        t.cyclePath || t.derivationPath || t.declineReason || t.steeringNote,
        `turn '${t.input}' has no named steering in its trace`,
      );
      assert.ok(t.parseSummary.length > 0);
    }
  }
});

test("reply/trace correspondence: a generating-steered reply asks toward expression; a controlling one toward the restrainer", () => {
  const s = newSession();
  const results = run(s, SCENARIOS[0].turns);
  const gen = results.find((r) => r.trace.cyclePath?.includes("generating"))!;
  assert.match(gen.reply, /What did you say/, "the generating reply takes up the expression side named in its trace");
  const ctl = results.find((r) => r.trace.cyclePath?.includes("controlling"))!;
  assert.match(ctl.reply, /settle/, "the controlling reply takes up the restraint side named in its trace");
});
