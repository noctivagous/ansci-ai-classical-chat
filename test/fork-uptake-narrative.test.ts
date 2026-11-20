/**
 * fork-uptake-narrative.test.ts — the narrative-uptake
 * programme's pins (UN-1, UN-2, FIX; 2026-11-19).
 *
 * UN-1 · The event-register authority (event-register.ts)
 * and the narrative ground (uptake.ts): a banked table,
 * sibling to the classification table, files EVENT-KINDS
 * under the uptake registers — death / loss / harm of a
 * bound person → grief, the visitor's achievement → joy,
 * threat to a bound person → fear, ruin of the visitor's
 * own undertaking → grief at low degree. Register and
 * degree are separate determinations (the owner's axes
 * doctrine, 2026-11-19): the register from the event-kind,
 * the degree from the kind's weight at the binding's
 * closeness. The binding is half of every entry — kin by
 * the surface's possessive or by unattributed standing in
 * the visitor's own telling, the visitor's own agency or
 * patienthood, possession in the surface — and an event
 * bound to nobody in the room matches nothing.
 *
 * The owner's register filings (the corrected attested
 * fivefold table and the layered mapping, determinations
 * of 2026-11-19) are pinned where the register walk reads
 * them: worry seated with pensiveness at Earth/spleen (the
 * table's filing; the EDU's 憂 at Metal named beside it,
 * not harmonised); apprehension a variant inside fear at
 * low degree; elation inside joy; frustration inside
 * anger; fright recognised but UNSEATED; pensiveness at
 * Earth (canonical — an earlier same-day Metal filing was
 * withdrawn before any code carried it); love filed
 * nowhere.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { newSession, type Session, type StateRecord } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";
import { parse } from "../src/fork/parse";
import type { ParsedSentence } from "../src/fork/sentence";
import {
  assessNarrativeGround,
  degreeOf,
  registerOf,
  UPTAKE_NARRATIVE_THRESHOLD,
} from "../src/fork/uptake";
import { matchEventRegister, narrativeGuard } from "../src/fork/event-register";

function run(s: Session, texts: string[]): TurnResult[] {
  return texts.map((t) => processTurn(s, t));
}

function regName(lemma: string): string | undefined {
  const r = registerOf(state(lemma));
  return r?.kind === "canonical" ? r.name : undefined;
}

function state(lemma: string, concept?: string): StateRecord {
  return { holder: "you", lemma, concept, turn: 1, origin: { kind: "parsed" } };
}

/** The session's recorded event for a single telling. */
function toldEvent(text: string): { session: Session; event: NonNullable<Session["events"][number]> } {
  const session = newSession();
  processTurn(session, text);
  const event = session.events[session.events.length - 1];
  assert.ok(event, `an event stands recorded for: ${text}`);
  return { session, event };
}

/* ---- the owner's register filings, read at the walk ---- */

test("UN-1 filings: worry files under its own recognition name, seated with pensiveness at Earth — both provenances named", () => {
  for (const w of ["worry", "worried", "anxiety"]) {
    const r = registerOf(state(w));
    assert.equal(r?.kind, "canonical");
    assert.equal(r?.name, "worry", `${w} keeps its recognition name`);
    assert.match(r!.authority, /Earth\/spleen/, "the ruling's seat is named");
    assert.match(r!.authority, /Metal\/lung/, "the EDU's canonical provenance stands beside it, not harmonised away");
  }
});

test("UN-1 filings: the family variants the ruling names — apprehension in fear at low degree, elation in joy, frustration in anger", () => {
  assert.equal(regName("apprehension"), "fear");
  assert.equal(degreeOf(state("apprehension")).degree, "low", "apprehension is the fear register at low degree, from the filing itself");
  assert.match(degreeOf(state("apprehension")).evidence, /owner's determination/);
  assert.equal(regName("elation"), "joy");
  assert.equal(regName("frustration"), "anger");
});

test("UN-1 filings: fright stands recognised but unseated; pensiveness stands at Earth; love files nowhere", () => {
  const fright = registerOf(state("fright"));
  assert.equal(regName("fright"), "fright", "fright is a recognised register");
  assert.match(fright!.authority, /UNSEATED/, "no element, no organ — the record says so in those terms");
  const pensiveness = registerOf(state("pensiveness"));
  assert.equal(regName("pensiveness"), "pensiveness");
  assert.match(pensiveness!.authority, /filed at Earth/, "the canonical seat stands — the withdrawn Metal filing was never carried");
  assert.equal(registerOf(state("love")), undefined, "love stands in no filing — reported, not changed");
});

/* ---- the table: matching, binding, degree ---- */

test("UN-1 table: a parent's death told plainly matches grief at high degree, bound by the surface's possessive", () => {
  const { session, event } = toldEvent("My father died last week.");
  const m = matchEventRegister(session, event);
  assert.equal(m?.entry.id, "death-of-a-bound-person");
  assert.equal(m?.entry.register, "grief");
  assert.equal(m?.binding.closeness, "immediate-kin");
  assert.equal(m?.degree, "high");
  assert.match(m!.derivation, /register axis/);
  assert.match(m!.derivation, /degree axis: high/, "the two determinations are named apart");
});

test("UN-1 table: a death attributed to another binds to nobody — the neighbour's father matches nothing", () => {
  const { session, event } = toldEvent("Her father died.");
  assert.equal(event.agent, "father");
  assert.equal(matchEventRegister(session, event), undefined, "a competing possessor stands in the surface");
});

test("UN-1 table: a stranger's death in a story matches nothing (P-005's shape, generalised)", () => {
  const { session, event } = toldEvent("A girl died in the accident.");
  assert.equal(matchEventRegister(session, event), undefined, "'girl' is no kin of the visitor's and binds to nobody in the room");
});

test("UN-1 table: dismissal in the retained construction files as loss of one's job, at plain degree", () => {
  const { session, event } = toldEvent("I got fired.");
  const m = matchEventRegister(session, event);
  assert.equal(m?.entry.id, "loss-of-ones-job");
  assert.equal(m?.degree, "plain");
});

test("UN-1 table: an achievement requires a real object — the 'won't' phantom 'win' matches nothing (P-083's guard)", () => {
  const session = newSession();
  const phantom = { verb: "win", agent: "you", theme: "be", recipient: "t", turn: 1, text: "I had a skydiving accident over the weekend and won ' t be able to come to school today ." };
  assert.equal(matchEventRegister(session, phantom), undefined, "theme 'be' is a verb-form in the slot, not an object");
  const { session: s2, event } = toldEvent("I passed the exam.");
  assert.equal(matchEventRegister(s2, event)?.entry.id, "achievement-of-the-visitor");
});

test("UN-1 table: losing a possessed thing files as loss at plain; ruining one's own undertaking at low", () => {
  const lost = toldEvent("I lost my job.");
  assert.equal(matchEventRegister(lost.session, lost.event)?.entry.id, "loss-of-a-bound-person-or-thing");
  assert.equal(matchEventRegister(lost.session, lost.event)?.degree, "plain");
  const ruined = toldEvent("I ruined my weekend.");
  const m = matchEventRegister(ruined.session, ruined.event);
  assert.equal(m?.entry.id, "ruin-of-the-visitors-own-undertaking");
  assert.equal(m?.degree, "low", "the axes doctrine's own example: a spoiled undertaking is grief at low degree");
});

/* ---- the narrative ground: weight, guards, provenance ---- */

test("UN-1 ground: a parent's death clears the narrative threshold on its telling; its provenance names the axes apart", () => {
  const session = newSession();
  processTurn(session, "My father died last week.");
  const event = session.events[session.events.length - 1];
  const ground = assessNarrativeGround(session, event, parse("My father died last week.", "en"));
  assert.ok(ground);
  assert.equal(ground.registerKey, "grief");
  assert.equal(ground.degree, "high");
  assert.equal(ground.weight, 3);
  assert.ok(ground.weight >= UPTAKE_NARRATIVE_THRESHOLD, "high narrative degree clears the derived-support bar");
  assert.equal(ground.guardReason, undefined);
  assert.match(ground.provenance, /narrative \(event-carried\)/);
});

test("UN-1 ground: a plain narrative ground is receipt matter until the register returns", () => {
  const session = newSession();
  processTurn(session, "I got fired.");
  const first = session.events[session.events.length - 1];
  const g1 = assessNarrativeGround(session, first, parse("I got fired.", "en"));
  assert.equal(g1?.weight, 2, "plain degree, first telling — below the narrative threshold");
  processTurn(session, "I lost my job.");
  const second = session.events[session.events.length - 1];
  const g2 = assessNarrativeGround(session, second, parse("I lost my job.", "en"));
  assert.equal(g2?.match.entry.id, "loss-of-a-bound-person-or-thing");
  assert.equal(g2?.returning, false, "a different entry is not a return of this register's event-kind");
  processTurn(session, "I lost my keys.");
  const third = session.events[session.events.length - 1];
  const g3 = assessNarrativeGround(session, third, parse("I lost my keys.", "en"));
  assert.equal(g3?.match.entry.id, "loss-of-a-bound-person-or-thing");
  assert.equal(g3?.returning, true, "the same event-kind told again is a return");
  assert.equal(g3?.weight, 3, "plain degree plus the return clears the narrative threshold");
});

test("UN-1 guards: a negated death is not a told death (the real parse carries the negation)", () => {
  const session = newSession();
  processTurn(session, "My father did not die.");
  const event = session.events[session.events.length - 1];
  const ground = assessNarrativeGround(session, event, parse("My father did not die.", "en"));
  assert.ok(ground, "the match stands on the record's fields");
  assert.match(ground.guardReason ?? "", /negated/, "the telling stands the ground down by name");
});

test("UN-1 guards: a subjunctive clause is not a told event; a mediated turn occasions no narrative ground", () => {
  const session = newSession();
  processTurn(session, "My father died last week.");
  const event = session.events[session.events.length - 1];
  const subjunctive = {
    meaning: {
      rootId: "n1",
      nodes: [{ id: "n1", lemma: "die", role: "verb", syntacticElement: "Wood", states: { mood: "subjunctive" } }],
      edges: [],
    },
    connective: { tokens: [] },
  } as unknown as ParsedSentence;
  assert.match(narrativeGuard(session, event, subjunctive) ?? "", /subjunctive/);
  const mediatedSession = newSession();
  mediatedSession.events.push(
    { verb: "read", agent: "you", turn: 1, text: "I read the paper." },
    { verb: "die", agent: "father", turn: 1, text: "my father died" },
  );
  const told = parse("My father died last week.", "en");
  assert.match(narrativeGuard(mediatedSession, mediatedSession.events[1], told) ?? "", /mediated report/);
});

/* ------------------------------------------------------------------ */
/* UN-2 · the rendering licence                                        */
/* ------------------------------------------------------------------ */

test("UN-2 licence: a parent's death told after a greeting is met by the stance and the event as told — and no feeling is predicated of the visitor", () => {
  const s = newSession();
  const [, r] = run(s, ["Hello.", "My parents died in an accident."]);
  assert.equal(r.reply, "I am very sorry. The parent died.");
  assert.equal(r.trace.uptake?.ground, "narrative");
  assert.equal(r.trace.uptake?.entry, "death-of-a-bound-person");
  assert.equal(r.trace.uptake?.stanceLemma, "sorry");
  assert.ok(!/You are|You feel/.test(r.reply), "testimony discipline: the visitor stated no feeling, so none is predicated");
});

test("UN-2 licence: without a greeting the same telling stands down at the phase gate, priced in the trace (P-110's bound)", () => {
  const s = newSession();
  const rs = run(s, [
    "Is skydiving dangerous?",
    "I would like to try skydiving but my parents are against it.",
    "my parents dies in an accident",
  ]);
  const last = rs[rs.length - 1];
  assert.equal(last.trace.uptake?.ground, "narrative");
  assert.match(last.trace.uptake?.stoodDown ?? "", /phase is 'opening'/, "the family's own gate, named — the conversation never left its opening");
});

test("UN-2 licence: a low-degree narrative ground remains receipt matter, its stand-down named (P-027's shape)", () => {
  const s = newSession();
  const [, r] = run(s, ["Hello.", "I ruined my weekend because the refrigerator stopped cooling."]);
  assert.equal(r.reply, "Ok. You ruined the weekend.");
  assert.equal(r.trace.uptake?.ground, "narrative");
  assert.match(r.trace.uptake?.stoodDown ?? "", /narrative threshold/);
});

test("UN-2 licence: the negative controls at the turn level — another's father, a modal death", () => {
  const s = newSession();
  const [, r1] = run(s, ["Hello.", "Her father died."]);
  assert.equal(r1.trace.uptake, undefined, "no ground stands over a death bound to another");
  const s2 = newSession();
  const [, r2] = run(s2, ["Hello.", "My father might die."]);
  assert.equal(r2.trace.uptake, undefined, "a modal death records no bound death event — nothing is owed");
});

test("UN-2 combined shape: where a stated feeling rides a narrative event, the stated ground owns the predication (P-083's shape)", () => {
  const s = newSession();
  const [, r] = run(s, ["Hello.", "I feel sad because my father died."]);
  assert.equal(r.reply, "I am sorry. You are sad.");
  assert.equal(r.trace.uptake?.ground, "stated", "the stated ground answers; the narrative arm does not take the turn over");
});

test("UN-2 audit: narrative replies across different tellings share only what the shared inputs derive", () => {
  const s1 = newSession();
  const death = run(s1, ["Hello.", "My parents died in an accident."])[1].reply;
  const s2 = newSession();
  const loss = run(s2, ["Hello.", "I lost my job.", "I lost my keys."])[2].reply;
  assert.equal(loss, "I am sorry. You lost the key.");
  // The event clauses are the tellings' own; neither reply
  // carries the other's material.
  assert.match(death, /parent died/);
  assert.ok(!/key/.test(death));
  assert.match(loss, /lost the key/);
  assert.ok(!/parent/.test(loss));
  // What they share is the stance the shared register
  // derives — grief at the degrees each ground carries
  // (high: 'very sorry'; plain, returned: 'sorry').
  assert.match(death, /^I am very sorry\./);
  assert.match(loss, /^I am sorry\./);
});

test("UN-2 episode: a new telling of the event-kind on a later turn may be met again; one telling is not answered twice", () => {
  const s = newSession();
  const rs = run(s, ["Hello.", "My father died.", "My grandfather died."]);
  assert.equal(rs[1].trace.uptake?.ground, "narrative");
  assert.equal(rs[1].trace.uptake?.stoodDown, undefined);
  assert.equal(rs[2].reply, "I am sorry. The grandfather died.", "the grandfather's death is a new telling, met on its own ground");
});

/* ------------------------------------------------------------------ */
/* FIX · the three located items                                       */
/* ------------------------------------------------------------------ */

test("FIX (i): a firing registered on a verb-carried turn renders composed under it — it never vanishes by ordering (P-044)", () => {
  const s = newSession();
  const rs = run(s, [
    "Good evening, what is new with you?",
    "That sounds fun! I got a new book about Europe, I would love to travel there.",
    "I dream of walking through Europe one day.",
  ]);
  const last = rs[rs.length - 1];
  assert.equal(last.trace.uptake?.register, "dream");
  assert.equal(last.trace.uptake?.stoodDown, undefined, "the firing stands — no stand-down names it away");
  assert.equal(last.trace.uptake?.composedWithSteering, true);
  assert.match(last.reply, /^I am very sorry\. You are dream\. What's on your mind when it happens\?$/,
    "the uptake head takes the acknowledgement's place and the verb-carried follow follows it");
});

test("FIX (i): the 'hope' firing renders the same way (P-079)", () => {
  const s = newSession();
  const rs = run(s, [
    "Hello , Mr . Black , how are you ?",
    "Very well , thank you . It's nice to meet you again . I am awfully sorry for not being able to meet you at the airport , as I was busy yesterday . I do hope you had a very enjoyable trip from New York .",
  ]);
  const last = rs[rs.length - 1];
  assert.equal(last.trace.uptake?.register, "hope");
  assert.equal(last.trace.uptake?.composedWithSteering, true);
  assert.match(last.reply, /You hope\./, "the registered firing is in the reply, not only in the trace");
});

test("FIX (ii): a sympathy 'sorry' bound to another's situation receipts without the cross-examination (P-024)", () => {
  const s = newSession();
  const rs = run(s, [
    "My husband and I both work for ourselves -- a blessing and a curse at times, since it can be tough to determine a \"regular\" income.",
    "We found a pretty good balance in that I have a part-time job that I *love* -- and that comes with benefits like insurance. That's a big worry addressed, right there.",
    "I am sorry, because I absolutely know that concern. I truly hope you find a resolution to that.",
  ]);
  const last = rs[rs.length - 1];
  assert.match(last.reply, /You are sorry\./, "the sorry is met by the receipt");
  assert.ok(!/You were sorry\. What did you say or do\?/.test(last.reply), "no venting cross-examination over a sympathy state");
  // Registration stands: the feeling is in the record, filed as E1 files it.
  assert.ok(s.states.some((x) => x.holder === "you" && x.lemma === "sorry" && x.element === "Metal"));
});

test("FIX (ii): the formula shape binds too, and an own-act apology and an unbound own grief still steer (the controls)", () => {
  const formula = run(newSession(), ["Hello.", "I am sorry for your loss."]);
  assert.equal(formula[1].reply, "Ok. You are sorry.", "'sorry for …' takes the other's affairs as its object — receipt, not steering");
  const ownAct = run(newSession(), ["Hello.", "I am sorry because I broke it."]);
  assert.equal(ownAct[1].reply, "You were sorry. What did you say or do?", "an apology for one's own act binds to one's own doing — it steers as before");
  const ownGrief = run(newSession(), ["Hello.", "I feel gloomy."]);
  assert.equal(ownGrief[1].reply, "You were gloomy. What did you say or do?", "an unbound own grief state steers as before");
});

test("FIX (iii): a subordinate clause carrying its own verb and roles records its own event (P-036's ledger)", () => {
  const s = newSession();
  run(s, [
    "I love riding horses in this weather. Do you have any fun hobbies?",
    "I used to do some weight lifting before I injured my leg.",
    "I injured it in college and again last year falling off a horse.",
  ]);
  const injury = s.events.find((e) => e.verb === "injure" && e.text === "I injured my leg");
  assert.ok(injury, "the before-clause's injury stands in the ledger as its own event, as told");
  assert.equal(injury.agent, "you");
  assert.equal(injury.patient, "leg");
  const root = s.events.filter((e) => e.turn === injury.turn).pop();
  assert.equal(root?.verb, "use", "the root event still closes its turn — the subordinate event stands ahead of it");
});

test("FIX (iii): the history-grade link now serves on the sealed conversation's own telling", () => {
  const s = newSession();
  const rs = run(s, [
    "I love riding horses in this weather. Do you have any fun hobbies?",
    "I used to do some weight lifting before I injured my leg.",
    "I injured it in college and again last year falling off a horse.",
  ]);
  assert.match(rs[2].reply, /You told me you injured the leg\./, "the event leg serves the earlier injury — recorded, since FIX (iii), at its own grain");
});

test("FIX (iii): the mechanism is the class, not the specimen — and complement clauses stay the root's own material", () => {
  const s = newSession();
  run(s, ["I read the letter after I locked the door."]);
  assert.ok(s.events.some((e) => e.verb === "lock" && (e.patient === "door" || e.theme === "door")), "an after-clause's event records the same way");
  const s2 = newSession();
  run(s2, ["I know that you left."]);
  assert.ok(!s2.events.some((e) => e.verb === "leave"), "a 'that' complement records no event of its own — it is the root clause's material");
});
