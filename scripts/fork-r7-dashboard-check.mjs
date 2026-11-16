#!/usr/bin/env node
/**
 * fork-r7-dashboard-check.mjs — the §11 harness exercise (slice R7).
 *
 * Drives the SAME code path the dashboard's chat box uses:
 * Ask.tsx opens a session with newSession(composition,
 * frameFromClock()) — the disposition from the switcher, the
 * awareness frame from the visitor's real clock — and speaks
 * through processTurn. This script does exactly that (the
 * compositions and the frame construction are the dashboard's
 * own), through conversations exercising the seven behaviours
 * of the design note's §11, and writes the evidence and a
 * per-behaviour verdict to docs/fork/transcripts/
 * T-R7-dashboard-check.md.
 *
 * This is the harness-level exercise. §10 R7's acceptance —
 * the behaviours exercised through the dashboard itself, in
 * the browser, with traces inspected — is a separate step,
 * not claimed here.
 *
 * Verdicts are mechanical where the trace permits: each
 * behaviour lists the trace facts it checks, and the verdict
 * follows from them. A behaviour whose checks only partly
 * hold is reported NOT FULLY MET, with the failing half and
 * its mechanism named — not massaged into a pass.
 *
 * Run after a build: node scripts/fork-r7-dashboard-check.mjs
 * Exit code is 1 when any behaviour is not fully met.
 */
import { writeFileSync } from "node:fs";
import { newSession } from "../dist/src/fork/session.js";
import { processTurn } from "../dist/src/fork/turn.js";
import { NEUTRAL_COMPOSITION } from "../dist/src/fork/composition.js";
import { WOOD_DISPOSITION, WATER_DISPOSITION } from "../dist/src/fork/disposition.js";

/** The dashboard's frame construction (Ask.tsx frameFromClock). */
function frameFromClock() {
  const d = new Date();
  return { month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours() };
}

/** The leak scan of test/fork-turn.test.ts, verbatim. */
const LEAK = /\b(wood|fire|earth|metal|wuxing|yin|yang|element|elements|five elements)\b/i;

const allReplies = [];
const sections = [];
let anyUnmet = false;

function runConversation(composition, turns) {
  const session = newSession(composition, frameFromClock());
  const out = [];
  for (const input of turns) {
    const result = processTurn(session, input);
    allReplies.push(result.reply);
    out.push({ input, reply: result.reply, trace: result.trace });
  }
  return { session, out };
}

function renderConversation(out) {
  return out
    .map((t) => `- **You:** ${t.input}\n  **Ansci:** ${t.reply}`)
    .join("\n");
}

function verdictBlock(id, title, body, checks, verdict, verdictText) {
  if (verdict !== "MET") anyUnmet = true;
  sections.push(
    `## ${id} — ${title}\n\n${body}\n\nChecks:\n\n${checks.map((c) => `- ${c.pass ? "✓" : "✗"} ${c.text}`).join("\n")}\n\n**Verdict: ${verdict}.** ${verdictText}\n`,
  );
}

/* ------------------------------------------------------------------ */
/* Behaviour 1 — multi-turn conversation on home ground:              */
/* retention, reference resolved against the record, echo.            */
/* Conversations: T-R5's R5-1 (topic return) and R5-3 (echo as        */
/* graph facts), run as the dashboard runs them.                      */
/* ------------------------------------------------------------------ */
{
  const { session, out } = runConversation(NEUTRAL_COMPOSITION, [
    "The soup is cold.",
    "I was furious.",
    "I shouted at him.",
    "Is the soup cold?",
  ]);
  const t4 = out[3].trace;
  const standing = session.states.map((s) => `${s.holder}/${s.lemma}`);
  const checks = [
    { pass: out.every((t) => t.reply.length > 0), text: "all four turns answered" },
    {
      pass: standing.includes("soup/cold") && standing.includes("you/furious"),
      text: `the record retains what was established (standing states at the end: ${standing.join(", ")})`,
    },
    {
      pass: t4.cohesion?.relation === "return",
      text: `turn 4's question is resolved against the record as a topic return (cohesion: ${t4.cohesion ? `${t4.cohesion.relation}, ground — ${t4.cohesion.ground}` : "none recorded"})`,
    },
    {
      pass: !!t4.replyGraph && !t4.wordingNotDerived,
      text: "turn 4's reply is generated from a planner-built reply graph",
    },
  ];
  const echo = runConversation(NEUTRAL_COMPOSITION, ["I made the soup yesterday.", "Is the soup cold?"]);
  const graph = echo.out[1].trace.replyGraph ? JSON.parse(echo.out[1].trace.replyGraph) : undefined;
  const subject = graph?.nodes.find((n) => n.id === "reply-subject");
  checks.push({
    pass: subject?.lemma === "soup" && subject?.form === "soup" && subject?.det === "the",
    text: `echo as construction: the reply graph's subject is the person's own node material (lemma ${subject?.lemma}, form ${subject?.form}, det ${subject?.det})`,
  });
  const pass = checks.every((c) => c.pass);
  verdictBlock(
    "Behaviour 1",
    "Converse over multiple turns on the graph's home ground — retention, reference, echo",
    `${renderConversation(out)}\n\nEcho conversation:\n\n${renderConversation(echo.out)}`,
    checks,
    pass ? "MET" : "NOT MET",
    pass
      ? "The conversation retains what was established, resolves the returning question against the record, and builds its reply subject from the person's own material. (Turns 1–3 of the first conversation are the steering branches' hand wording — their traces record wording-not-derived, as the dashboard shows; the retention they demonstrate is the record's, which is what this behaviour claims.)"
      : "See the failed checks above.",
  );
}

/* ------------------------------------------------------------------ */
/* Behaviour 2 — answer from derivations; priced speech; the why      */
/* question answered with the derivation as its causal subordinate.   */
/* Conversation: T-R1's R1-1.                                         */
/* ------------------------------------------------------------------ */
{
  const { out } = runConversation(NEUTRAL_COMPOSITION, [
    "Is winter cold?",
    "Is the salt cold?",
    "Why is winter cold?",
  ]);
  const checks = [
    {
      pass: out.every((t) => !!t.trace.replyGraph && !t.trace.wordingNotDerived),
      text: "every reply is generated from a planner-built reply graph",
    },
    {
      pass: out.every((t) => !!t.trace.pricing && !!t.trace.derivationPath),
      text: "every trace names its derivation path and its pricing record",
    },
    {
      pass: out[0].trace.pricing?.weakestTier === "attested" && out[0].trace.pricing?.level === "plain",
      text: `the winter conclusion speaks at its earned strength (tier ${out[0].trace.pricing?.weakestTier}, support ${out[0].trace.pricing?.support}, level ${out[0].trace.pricing?.level})`,
    },
    {
      pass: /\bbecause\b/i.test(out[2].reply),
      text: "the why question is answered with the derivation path in causal form (the reply contains “because”)",
    },
  ];
  const pass = checks.every((c) => c.pass);
  verdictBlock(
    "Behaviour 2",
    "Answer from derivations, at the strength the pricing earns; show the working on demand",
    renderConversation(out),
    checks,
    pass ? "MET" : "NOT MET",
    pass
      ? "Conclusions are spoken at the strength their tier and support earn, and the why question draws the causal form out of the same derivation (§7.2's default, policy (a): the path is verbalised when asked for)."
      : "See the failed checks above.",
  );
}

/* ------------------------------------------------------------------ */
/* Behaviour 3 — ask only genuine questions: a valency-gap question   */
/* (T-R3's R3-1) and an initiative move under its bound (T-R6's       */
/* R6-1).                                                             */
/* ------------------------------------------------------------------ */
{
  const gap = runConversation(NEUTRAL_COMPOSITION, ["I gave him."]);
  const gt = gap.out[0].trace;
  const checks = [
    {
      pass: gt.gapQuestion?.verb === "give" && gt.gapQuestion?.role === "theme",
      text: `the follow-up question is generated from a genuine gap (gap question: ${gt.gapQuestion ? `${gt.gapQuestion.verb}/${gt.gapQuestion.role} — ${gt.gapQuestion.ground}` : "none recorded"})`,
    },
    {
      pass: gap.out[0].reply.trim().endsWith("?") && !!gt.replyGraph,
      text: "the question is generated from a question graph, not appended wording",
    },
  ];
  const init = runConversation(NEUTRAL_COMPOSITION, [
    "I was furious.",
    "I heard the news.",
    "The soup is sweet.",
    "I made the soup yesterday.",
    "The soup is green.",
  ]);
  checks.push(
    {
      pass: init.out.slice(0, 4).every((t) => !t.trace.initiative),
      text: "no initiative on turns 1–4 (each reply ends in a question of the steering, so no move can attach)",
    },
    {
      pass: init.out[4].trace.initiative?.shape === "unexpressed-state",
      text: `initiative fires once, from a standing state whose generating direction went unexpressed (turn 5: ${init.out[4].trace.initiative ? `${init.out[4].trace.initiative.shape} — ${init.out[4].trace.initiative.ground}` : "none recorded"})`,
    },
    {
      pass: !!init.out[4].trace.initiative && init.out[4].reply.includes(init.out[4].trace.initiative.sentence),
      text: "the initiative sentence is part of the spoken reply, and the session records exactly one initiative move",
    },
  );
  const pass = checks.every((c) => c.pass);
  verdictBlock(
    "Behaviour 3",
    "Ask only genuine questions — gap questions and bounded initiative, never a schedule",
    `Gap conversation:\n\n${renderConversation(gap.out)}\n\nInitiative conversation:\n\n${renderConversation(init.out)}`,
    checks,
    pass ? "MET" : "NOT MET",
    pass
      ? "Both question kinds arise from the record: a role the verb requires and the situation does not fill, and a standing thread the conversation has left unexpressed — each named in its trace."
      : "See the failed checks above.",
  );
}

/* ------------------------------------------------------------------ */
/* Behaviour 4 — correction as supersession (T-R5's R5-4), plus the   */
/* later turn §11 requires: a reply afterwards that USES the          */
/* corrected state.                                                   */
/* ------------------------------------------------------------------ */
{
  const { session, out } = runConversation(NEUTRAL_COMPOSITION, [
    "The soup is cold.",
    "The soup is hot.",
    "The soup is cool.",
    "Is the soup cold?",
  ]);
  const c2 = out[1].trace.correction;
  const c3 = out[2].trace.correction;
  const deltas = session.supersessions.map(
    (d) => `${d.holder}/${d.replaced.lemma} (turn ${d.replaced.turn}) → ${d.replacing.lemma} (turn ${d.turn})`,
  );
  const soupStanding = session.states.filter((s) => s.holder === "soup").map((s) => s.lemma);
  const t4 = out[3].trace;
  const t4UsesCorrected =
    /cool/.test(t4.derivationPath ?? "") ||
    /cool/.test(t4.cohesion?.ground ?? "") ||
    /\bcool\b/.test(out[3].reply);
  const checks = [
    {
      pass: c2?.rule === "value" && c2.replaced.lemma === "cold" && c2.replacing.lemma === "hot",
      text: `turn 2 records the supersession delta (correction: ${c2 ? `${c2.rule} rule, ${c2.replaced.lemma} → ${c2.replacing.lemma}` : "none"})`,
    },
    {
      pass: c3?.rule === "value" && c3.replaced.lemma === "hot" && c3.replacing.lemma === "cool",
      text: "turn 3 supersedes the corrected state itself — the record's deltas chain (cold → hot → cool)",
    },
    {
      pass: deltas.length === 2,
      text: `the session's recorded deltas are exactly the two corrections (${deltas.join("; ")})`,
    },
    {
      pass: t4UsesCorrected,
      text: "the later turn's reply uses the corrected state (cool) — its derivation, cohesion ground or wording engages the standing corrected state",
    },
  ];
  const firstHalf = checks.slice(0, 3).every((c) => c.pass);
  const pass = checks.every((c) => c.pass);
  verdictBlock(
    "Behaviour 4",
    "Handle correction as supersession — the delta acknowledged, and later replies using the corrected state",
    `${renderConversation(out)}\n\nStanding states for the soup at the end: ${soupStanding.join(", ") || "none"}.`,
    checks,
    pass ? "MET" : firstHalf ? "NOT FULLY MET" : "NOT MET",
    pass
      ? "Corrections are recorded as deltas, acknowledged from the delta, and the corrected state is what later replies work from."
      : "The supersession half holds exactly as designed: both corrections are recorded as deltas and acknowledged from them (“The soup is not cold, but it is hot.” / “…not hot, but it is cool.”). The later-turn half does NOT hold in this conversation: asked “Is the soup cold?” afterwards, the reply (“The soup may be cold.”) is derived from the classification table's path for cold and never consults the standing corrected state — and the turn records a fresh soup/cold state alongside the standing soup/cool. The mechanism is plain: the question site prices derivations from the table, and no site in R1–R6 makes a question answer read the record's standing state for its subject before deriving. §11.4's second clause is therefore not demonstrated; closing it is new work (a standing-state check at the question site), not a wording fix.",
  );
}

/* ------------------------------------------------------------------ */
/* Behaviour 5 — decline with a named ground, and stay in the         */
/* conversation (T-R3's R3-4, turns 1–3 and 5; the fixture turn is    */
/* the transcript runner's, not the dashboard path's).                */
/* ------------------------------------------------------------------ */
{
  const { out } = runConversation(NEUTRAL_COMPOSITION, [
    "Is the table cold?",
    "I bought the onions.",
    "What did I put in the soup?",
    "Is the salt cold?",
  ]);
  const checks = [
    {
      pass: !!out[0].trace.declineReason && /nothing on table/.test(out[0].trace.declineReason),
      text: `turn 1 declines on the missing-classification ground, named (“${out[0].trace.declineReason}”)`,
    },
    {
      pass: !out[1].trace.declineReason && out[1].reply.length > 0,
      text: "turn 2 is handled normally — the conversation continues after a decline",
    },
    {
      pass: !!out[2].trace.declineReason && /put/.test(out[2].trace.declineReason) && /theme/.test(out[2].trace.declineReason),
      text: `turn 3 declines on the missing-role ground, naming the verb and the role (“${out[2].trace.declineReason}”)`,
    },
    {
      pass: !!out[3].trace.derivationPath && out[3].trace.pricing?.level === "plain",
      text: "turn 4 is answered from a derivation at plain strength — a decline was a turn, not an ending",
    },
  ];
  const pass = checks.every((c) => c.pass);
  verdictBlock(
    "Behaviour 5",
    "Decline with a named ground — and stay in the conversation afterwards",
    renderConversation(out),
    checks,
    pass ? "MET" : "NOT MET",
    pass
      ? "Both decline kinds name their ground in the trace and in plain words on the surface, and the conversation carries on to an answered question."
      : "See the failed checks above.",
  );
}

/* ------------------------------------------------------------------ */
/* Behaviour 6 — vary with disposition, demonstrably: T-R4's R4-3     */
/* under Wood, Water and Neutral. Conclusions (the states recorded,   */
/* the classifications used) must be identical; the proceedings       */
/* (bias records, steering selection, qualification) must differ as   */
/* declared.                                                          */
/* ------------------------------------------------------------------ */
{
  const turns = ["I couldn't sleep.", "I was worried."];
  const wood = runConversation(WOOD_DISPOSITION, turns);
  const water = runConversation(WATER_DISPOSITION, turns);
  const neutral = runConversation(NEUTRAL_COMPOSITION, turns);
  const conclusions = (r) =>
    JSON.stringify({
      states: r.session.states.map((s) => `${s.holder}/${s.lemma}`).sort(),
      classifications: r.out.map((t) => t.trace.classifications.map((c) => `${c.concept}→${c.element}`).sort()),
    });
  const biasChannels = (r) => r.out.flatMap((t) => (t.trace.dispositionBias ?? []).map((b) => b.channel));
  const checks = [
    {
      pass: conclusions(wood) === conclusions(water) && conclusions(wood) === conclusions(neutral),
      text: "what is concluded is identical under all three compositions (same states recorded, same classifications used)",
    },
    {
      pass: biasChannels(wood).includes("move") && biasChannels(water).includes("move"),
      text: `the move channel fires under both reference compositions (Wood: ${biasChannels(wood).join(", ") || "none"}; Water: ${biasChannels(water).join(", ") || "none"})`,
    },
    {
      pass: biasChannels(neutral).length === 0,
      text: "no bias record under the neutral composition — its declared effect is none",
    },
    {
      pass: wood.out[1].reply !== water.out[1].reply,
      text: "the proceedings differ on the surface: the same turn is steered differently under Wood and under Water",
    },
  ];
  const pass = checks.every((c) => c.pass);
  verdictBlock(
    "Behaviour 6",
    "Vary with disposition, demonstrably — different proceedings, identical conclusions",
    `Under Wood-predominant:\n\n${renderConversation(wood.out)}\n\nUnder Water-predominant:\n\n${renderConversation(water.out)}\n\nUnder Neutral:\n\n${renderConversation(neutral.out)}`,
    checks,
    pass ? "MET" : "NOT MET",
    pass
      ? "Wood follows the generating direction (“What did you say or do?”); Water addresses the restrainer (“What is the worry about? That seems to be the thing holding the sleep back.”) — the declared move preferences of T-R4, visible in the traces as bias records, with nothing concluded differently. Turn 2's spoken strength also differs (Wood: possibility, via the generating arc's composed support; Water: qualified) — a difference of qualification, which §10 R4's acceptance expressly allows."
      : "See the failed checks above.",
  );
}

/* ------------------------------------------------------------------ */
/* Behaviour 7 — the surface stays clean: the leak scan over every    */
/* reply this exercise produced.                                      */
/* ------------------------------------------------------------------ */
{
  const leaks = allReplies.filter((r) => LEAK.test(r));
  const checks = [
    {
      pass: leaks.length === 0,
      text: `${allReplies.length} replies scanned with the test suite's leak pattern (wood|fire|earth|metal|wuxing|yin|yang|element…); ${leaks.length} leaks${leaks.length ? `: ${leaks.join(" / ")}` : ""}`,
    },
  ];
  verdictBlock(
    "Behaviour 7",
    "Keep the surface clean — no ontology vocabulary in any reply",
    "Every reply produced by the conversations above, scanned as the turn-loop tests scan them.",
    checks,
    leaks.length === 0 ? "MET" : "NOT MET",
    leaks.length === 0
      ? "No reply names an element, a polarity, a cycle or the disposition — across planner replies, probe-worded turns, declines, questions and initiative alike."
      : "See the leaking replies above.",
  );
}

/* ------------------------------------------------------------------ */

const frameSession = newSession(NEUTRAL_COMPOSITION, frameFromClock());
const f = frameSession.frame;
const header = `# T-R7 — the §11 dashboard-check exercise (harness level)

Produced by \`scripts/fork-r7-dashboard-check.mjs\` on ${new Date().toISOString()},
driving the same code path the dashboard's chat box uses:
sessions opened as \`newSession(composition, frameFromClock())\`
(the disposition from the switcher; the frame from the real
clock, as Ask.tsx builds it; the role neutral, the engine's
default), turns spoken through \`processTurn\`.

This run's frame: season ${f?.season ? `${f.season.name} (${f.season.element})` : "not determined"} · daypart ${f ? `${f.daypart.name}${f.daypart.element ? ` (${f.daypart.element})` : ""}${f.daypart.polarity ? `, polarity ${f.daypart.polarity}` : ""}` : "none"}.

Scope, stated plainly: this is the harness-level exercise.
§10 R7's acceptance — the §11 behaviours exercised through
the dashboard itself, in the browser, with traces inspected —
is a separate step and is NOT claimed by this file. What is
claimed: the code path the dashboard runs produces these
replies and these traces.

Conversations are the frozen transcript scenarios of the
earlier slices where §11's behaviours have one (T-R1, T-R3,
T-R4, T-R5, T-R6), run under the dashboard's session setup.

`;

writeFileSync(
  new URL("../docs/fork/transcripts/T-R7-dashboard-check.md", import.meta.url),
  header + sections.join("\n"),
);
console.log(sections.map((s) => s.match(/\*\*Verdict: [^*]+\*\*/)?.[0] ?? "").join("\n"));
console.log(`\nwrote docs/fork/transcripts/T-R7-dashboard-check.md — ${allReplies.length} replies exercised`);
process.exit(anyUnmet ? 1 : 0);
