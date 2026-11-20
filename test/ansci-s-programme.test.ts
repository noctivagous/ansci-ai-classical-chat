/**
 * ansci-s-programme.test.ts — the S programme (2026-11-19):
 * the targeted edges the R and E programmes left named —
 * the acknowledgement family's rendering admission (S0),
 * the self-query family's discrimination and remainders
 * (S1), the social forms' breadth (S2), the absence-stance
 * (S3), attestation breadth at the token exit (S4), and
 * segmentation by default (S5). Commissioned from the
 * sealed probe runs' records (GAPS §2): run 2's located
 * failure shapes, the R-tip run's one regression, and the
 * R/E programmes' handoff notes.
 *
 * S0 — echo and receipt soundness: the statement branches'
 * acknowledgement echo, their own-turn gap question, and
 * every receipt rendering pass the same soundness admission
 * R4 set for the initiative scan's steering predications —
 * the record's agent in the record's grain, every rendered
 * fill sound, no word the token resolver's matcher
 * substituted for a different written word — and a rendering
 * that fails admission falls back to the plain
 * acknowledgement rather than showing a garble.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn, type TurnResult } from "../src/ansci/turn";

function run(session: Session, texts: string[]): TurnResult[] {
  return texts.map((t) => processTurn(session, t));
}

test("S0: the echo does not take the visitor as agent of another's event, and no gap question rides on it (P-097)", () => {
  const s = newSession();
  const [r] = run(s, ["My turtle ran away from me today."]);
  assert.equal(r.reply, "Ok. Noted.");
  assert.equal(r.trace.gapQuestion, undefined, "no gap question is formed over the turtle's event");
});

test("S0: the P-030 receipts stand down — no 'the her', no predicated matcher guess ('movie')", () => {
  const s = newSession();
  const results = run(s, [
    "The hardest time in my life was when my best friend died on Christmas of 2007.",
    "She fell off of a roof. She fell asleep and when she got up_comma_ she slipped.",
    "It has been a long time so I have come to cope with it_comma_ but sometimes it's still hard. I named my daughter after her. Her name is Roxie.",
  ]);
  assert.equal(results[1].reply, "Ok.", "the 'she fell the of' receipt stands down with its fills");
  // Re-pinned 2026-11-19 (X1 of the X programme): the name
  // is now RECORDED as told — the state holds 'roxie', the
  // surface the person wrote, not the matcher's 'movie' —
  // so the receipt soundly predicates the person's own
  // word and refers back to the daughter by it. S0's bars
  // stand untouched: the guess is never spoken (below), and
  // no pronoun renders in a determiner slot.
  assert.equal(results[2].reply, "Ok. Ok. Her name is roxie.");
  for (const r of results) {
    assert.ok(!r.reply.includes("movie"), "the matcher's guess is never spoken as the person's word");
    assert.ok(!r.reply.includes("the her"), "a pronoun is never rendered in a determiner slot");
  }
  // The naming state stands in the record — holding the
  // name as told (X1), with no classification of the guess
  // behind it.
  assert.ok(
    s.states.some((st) => st.holder === "name" && st.lemma === "roxie"),
    "the naming state stands in the record, as told",
  );
});

test("S0: a naming statement on its own turn receipts nothing the matcher guessed", () => {
  const s = newSession();
  const [, r] = run(s, ["The garden is cold.", "Her name is Roxie."]);
  // Re-pinned 2026-11-19 (X1 of the X programme): what the
  // receipt predicates is the person's own word, recorded
  // as told — the guess ('movie') is receipted nowhere,
  // which remains this test's pin.
  assert.equal(r.reply, "Ok. Her name is roxie.");
  assert.ok(!r.reply.includes("movie"));
});

test("S0: the venting steering stands down over an event that is not the visitor's own (P-037)", () => {
  const s = newSession();
  const results = run(s, [
    "I have horses, I love them and work together with them",
    "My other hobbies are cooking by using it from my garden",
  ]);
  assert.equal(results[1].reply, "Ok.");
  assert.ok(!results[1].reply.includes("the it") && !results[1].reply.includes("the using"));
});

test("S0: the venting steering still fires over the visitor's own soundly-filled event", () => {
  const s = newSession();
  const [, r] = run(s, ["I am worried.", "I put the salt in the soup."]);
  assert.equal(r.reply, "You put the salt in the soup. Now that it's out — what would help you settle?");
});

test("S0: the steering temporal clause renders only the visitor's own soundly-filled event", () => {
  const s = newSession();
  const [, r] = run(s, ["I named my daughter after her.", "I am furious."]);
  assert.equal(r.reply, "You were furious. What did you say or do?");
  const s2 = newSession();
  const [, r2] = run(s2, ["I heard the news.", "I am furious."]);
  assert.equal(r2.reply, "You were furious when you heard the news. What did you say when you heard the news?");
});

test("S0: a third party's event is receipted in the agent's own grain, fills sound", () => {
  const s = newSession();
  const [, r] = run(s, ["The garden is cold.", "Mary bought the flowers."]);
  assert.equal(r.reply, "Ok. The mary bought the flower.");
});

test("S0: the visitor's own gap question still fires, its echo sound (control)", () => {
  const s = newSession();
  const [r] = run(s, ["I gave him."]);
  assert.equal(r.reply, "You gave. What did you give him?");
});

// ---------------------------------------------------------------------------
// S1 · Self-query discrimination and remainders. The C3 family
// grows by general shapes: the doing's sphere discriminates
// leisure from occupation; the wh-NP have-question files the
// noun the graph dropped; the family-origin question files
// the family; and the elliptical return (shape (h)) resolves
// its matter from the exchange. Specimens are the run-2
// remainders named in the S brief.
// ---------------------------------------------------------------------------

test("S1: leisure is not occupation — 'for fun' draws the hobbies denial", () => {
  const s = newSession();
  const r = processTurn(s, "What do you do for fun?");
  assert.equal(r.reply, "I don't have any hobbies.");
});

test("S1: the occupation answers stand (controls)", () => {
  const s = newSession();
  assert.equal(
    processTurn(s, "What do you do?").reply,
    "I don't have a job. I can talk over simple statements and questions.",
  );
  const s2 = newSession();
  assert.equal(
    processTurn(s2, "What do you do for a living?").reply,
    "I don't have a job. I can talk over simple statements and questions.",
  );
});

test("S1: the wh-NP have-question files its noun ('What pets do you have?')", () => {
  const s = newSession();
  const r = processTurn(s, "What pets do you have?");
  assert.equal(r.reply, "I don't have any pets.");
});

test("S1: a bare 'What do you have?' is not captured by the wh-NP shape", () => {
  const s = newSession();
  const r = processTurn(s, "What do you have?");
  assert.ok(!r.reply.startsWith("I don't have"), r.reply);
});

test("S1: the family-origin question files the family", () => {
  const s = newSession();
  const r = processTurn(s, "Do you come from a big family?");
  assert.equal(r.reply, "I don't have a family.");
});

test("S1: the elliptical return resolves its matter from the preceding statement (P-047)", () => {
  const s = newSession();
  const r = processTurn(s, "Puerto Rico is my birth place. What about yours?");
  assert.equal(r.reply, "Ok. Noted. I don't have a birthplace.");
});

test("S1: the return resolves across turns, and for a born statement", () => {
  const s = newSession();
  processTurn(s, "I was born in Ohio.");
  const r = processTurn(s, "What about you?");
  assert.equal(r.reply, "I don't have a birthplace.");
});

test("S1: the return after a have-possession answers in the same matter", () => {
  const s = newSession();
  const r = processTurn(s, "I have a dog. What about you?");
  assert.equal(r.reply, "Ok. Noted. I don't have any dogs.");
});

test("S1: the your-NP return names its matter on its face", () => {
  const s = newSession();
  const r = processTurn(s, "What about your family?");
  assert.equal(r.reply, "I don't have a family.");
});

test("S1: the name return routes to the identity presentation, not a denial", () => {
  const s = newSession();
  const r = processTurn(s, "My name is Carmen. What about yours?");
  assert.ok(r.reply.includes("I am AnSci."), r.reply);
  assert.ok(!r.reply.includes("I don't have a name"), r.reply);
});

test("S1: a topic return is not a self-query ('What about the strike?')", () => {
  const s = newSession();
  const r = processTurn(s, "What about the strike?");
  assert.equal(r.reply, "Ok. Noted.");
});

test("S1: a matter word in a statement about something else does not arm the return", () => {
  const s = newSession();
  const r = processTurn(s, "The family in the story was large. What about you?");
  assert.ok(!r.reply.includes("I don't have a family"), r.reply);
});

test("S1: a bare return with nothing in play is not answered as a self-query", () => {
  const s = newSession();
  const r = processTurn(s, "What about yours?");
  assert.ok(!r.reply.includes("I don't have"), r.reply);
});

// ---------------------------------------------------------------------------
// S2 · Social-form breadth. Three undrawn shapes from run 2:
// the offer of help received as the social act it is, the
// either/or question as a question form, and the un-drawn
// how-are-you phrasings (the doing forms with their time
// adjuncts, the fused greeting heads, the there-greetings).
// Each form fires only on the shape it names.
// ---------------------------------------------------------------------------

test("S2: the offer of help is received as the act it is (P-065/P-066 forms)", () => {
  const s = newSession();
  assert.equal(processTurn(s, "Can I help you?").reply, "No, thank you.");
  const s2 = newSession();
  assert.equal(processTurn(s2, "Good evening , madam . Can I help you ?").reply, "Good evening. No, thank you.");
  const s3 = newSession();
  assert.equal(processTurn(s3, "Good afternoon ! Can I help you ?").reply, "Good afternoon. No, thank you.");
});

test("S2: the how-prefixed offer is the same act (P-070 form)", () => {
  const s = newSession();
  assert.equal(processTurn(s, "Yes , how can I help you ?").reply, "No, thank you.");
});

test("S2: a capability question about helping is not an offer (control)", () => {
  const s = newSession();
  const r = processTurn(s, "Can you help me?");
  assert.ok(!r.reply.includes("No, thank you"), r.reply);
});

test("S2: the preference either/or is answered from the limits facts (P-056)", () => {
  const s = newSession();
  assert.equal(processTurn(s, "Do you prefer milk or dark?").reply, "I don't have a preference.");
  const s2 = newSession();
  assert.equal(processTurn(s2, "Do you like tea or coffee?").reply, "I don't have a preference.");
});

test("S2: a volition either/or is not the preference form (control)", () => {
  const s = newSession();
  const r = processTurn(s, "Do you want tea or coffee?");
  assert.ok(!r.reply.includes("preference"), r.reply);
});

test("S2: the being either/or is answered in its own form (P-107)", () => {
  const s = newSession();
  assert.equal(processTurn(s, "Are you an aunt or uncle yet?").reply, "I am not an aunt or an uncle.");
});

test("S2: the or-headed being form recovers its second alternative from the token record", () => {
  const s = newSession();
  assert.equal(processTurn(s, "Are you a cat or a dog?").reply, "I am not a cat or a dog.");
});

test("S2: an alternative naming the system's own kind defeats the being form", () => {
  const s = newSession();
  const r = processTurn(s, "Are you a system or a human?");
  assert.ok(!r.reply.startsWith("I am not"), r.reply);
});

test("S2: an either/or not addressed to the system is untouched (control)", () => {
  const s = newSession();
  const r = processTurn(s, "Is the soup hot or cold?");
  assert.ok(!r.reply.startsWith("I am not"), r.reply);
});

test("S2: the doing forms of the wellbeing enquiry, with their time adjuncts", () => {
  const s = newSession();
  assert.equal(processTurn(s, "Hello, how are you doing tonight?").reply, "Hello. I am fine.");
  const s2 = newSession();
  assert.equal(processTurn(s2, "Greetings! How are you doing today?").reply, "Greetings. I am fine.");
});

test("S2: the fused greeting heads segment, comma and comma-less forms alike", () => {
  const s = newSession();
  assert.equal(processTurn(s, "good evening how are you?").reply, "Good evening. I am fine.");
  const s2 = newSession();
  assert.equal(processTurn(s2, "hey there how are you today?").reply, "Hey there. I am fine.");
  const s3 = newSession();
  assert.equal(processTurn(s3, "Hi there, how are you tonight?").reply, "Hi there. I am fine.");
});

test("S2: the there-greeting mirrors as a greeting (control for the peel)", () => {
  const s = newSession();
  assert.equal(processTurn(s, "hey there.").reply, "Hey there.");
});

test("S2: the manner question is still not the wellbeing exchange (control)", () => {
  const s = newSession();
  const r = processTurn(s, "How do you do it?");
  assert.ok(!r.reply.includes("I am fine"), r.reply);
});

test("S2: a content question after a greeting head keeps its own path (control)", () => {
  const s = newSession();
  const r = processTurn(s, "Good evening how is the garden?");
  assert.ok(r.reply.startsWith("Good evening."), r.reply);
  assert.ok(!r.reply.includes("I am fine"), r.reply);
});

// ---------------------------------------------------------------------------
// S3 · Absence-stance (determination: Part I of the repair
// programme). An asserted predication that is checkable —
// its quality classified, its subject a term of the graph's
// correspondence order — and that the graph neither supports
// nor contradicts draws the located absence stance. The
// assertion stands in the record as told; supported and
// contradicted claims keep their paths, and predications
// about classified things (the soup, the garden) are
// tellings, never stance material.
// ---------------------------------------------------------------------------

test("S3: a checkable unsupported assertion draws the absence stance", () => {
  const s = newSession();
  const r = processTurn(s, "Winter is dry.");
  assert.equal(r.reply, "I don't have Winter as dry in what I know.");
  assert.equal(r.trace.stance?.outcome, "absence-stated");
});

test("S3: the stance covers the correspondence terms (a season, a time)", () => {
  const s = newSession();
  assert.equal(processTurn(s, "The night is dry.").reply, "I don't have night as dry in what I know.");
});

test("S3: the asserted state stands in the record as told (no set-aside)", () => {
  const s = newSession();
  processTurn(s, "Winter is dry.");
  const held = s.states.find((x) => x.holder === "winter" && x.lemma === "dry");
  assert.ok(held, "the telling stands in the record");
  assert.equal(s.conversation.disagreements.length, 0);
  assert.equal(s.conversation.pending, null);
});

test("S3: the stance is stated at the first telling only", () => {
  const s = newSession();
  processTurn(s, "Winter is dry.");
  const r = processTurn(s, "Winter is dry.");
  assert.equal(r.reply, "Ok. Winter is dry.");
  assert.equal(r.trace.stance, undefined);
});

test("S3: a supported assertion draws no stance (control)", () => {
  const s = newSession();
  const r = processTurn(s, "Winter is cold.");
  assert.equal(r.reply, "Ok. Noted.");
  assert.equal(r.trace.stance, undefined);
});

test("S3: a contradicted assertion keeps the set-aside stance (control)", () => {
  const s = newSession();
  const r = processTurn(s, "Winter is hot.");
  assert.equal(r.reply, "Winter is cold, as I have it.");
  assert.equal(r.trace.stance?.outcome, "stated");
});

test("S3: a telling about a classified thing draws no stance, however unsupported (controls)", () => {
  // The axes repair's own specimen: soup temperature is
  // absence of degree, and the telling is recorded as told.
  const s = newSession();
  const r = processTurn(s, "The soup is hot.");
  assert.equal(r.reply, "Ok. Noted.");
  assert.equal(r.trace.stance, undefined);
  const s2 = newSession();
  assert.equal(processTurn(s2, "The garden is cold.").trace.stance, undefined);
  const s3 = newSession();
  assert.equal(processTurn(s3, "Salt is sweet.").trace.stance, undefined);
});

test("S3: an uncheckable assertion draws no stance (controls)", () => {
  const s = newSession();
  const r = processTurn(s, "The dog is loyal.");
  assert.equal(r.reply, "Ok. Noted.");
  assert.equal(r.trace.stance, undefined);
  const s2 = newSession();
  assert.equal(processTurn(s2, "Mary is tall.").trace.stance, undefined);
});

// ---------------------------------------------------------------------------
// S4 · Attestation breadth (determinations recorded in GAPS
// §6). (a) A word of ordinary currency in the repo's
// wordfreq table (Zipf >= 3.0) attests itself, though the
// hand lexicon does not file it — the token-clarification
// trigger no longer fires on correct words. (b) A pure digit
// string attests by its form, as a capital attests a name.
// Genuinely unattested tokens still trigger.
// ---------------------------------------------------------------------------

test("S4a: the run-2 survivor words no longer trigger a clarification", () => {
  for (const [turn, word] of [
    ["Canning is great for storing food.", "canning"],
    ["Scotch goes good with anything lol.", "lol"],
    ["I let him roam around the house.", "roam"],
    ["I really try but it's hard to replicate that day for sure.", "replicate"],
    [
      "it was good, this happened in my adult life so we all had work and stuff and maybe did not socialize as often",
      "socialize",
    ],
  ] as const) {
    const s = newSession();
    const r = processTurn(s, turn);
    assert.ok(!r.reply.startsWith("Did you mean"), `${word}: ${r.reply}`);
    assert.ok(!r.reply.startsWith("Could you put that another way"), `${word}: ${r.reply}`);
  }
});

test("S4a: a genuinely unattested token still triggers (control)", () => {
  const s = newSession();
  const r = processTurn(s, "I had a wethr problem.");
  assert.ok(r.reply.startsWith("Did you mean"), r.reply);
});

test("S4a: attestation is the wordfreq table at the ruled threshold", async () => {
  const { isAttestedWord, FREQUENCY_ATTESTATION_ZIPF } = await import("../src/ansci/token-resolve");
  assert.equal(FREQUENCY_ATTESTATION_ZIPF, 3.0);
  assert.equal(isAttestedWord("canning"), true);
  assert.equal(isAttestedWord("socialize"), true);
  assert.equal(isAttestedWord("lol"), true);
  assert.equal(isAttestedWord("qwerty"), false); // Zipf 2.5 — below the line
  assert.equal(isAttestedWord("cimbing"), false); // unattested in the table
  assert.equal(isAttestedWord("wethr"), false);
});

test("S4b: a digit string attests by form — P-030's first turn no longer sinks", () => {
  const s = newSession();
  const r = processTurn(s, "The hardest time in my life was when my best friend died on Christmas of 2007.");
  assert.equal(r.reply, "Ok. Noted.");
});

test("S4b: the whole P-030 conversation stands recovered (S0 + S4)", () => {
  const s = newSession();
  const replies = [
    "The hardest time in my life was when my best friend died on Christmas of 2007.",
    "She fell off of a roof. She fell asleep and when she got up_comma_ she slipped.",
    "It has been a long time so I have come to cope with it_comma_ but sometimes it's still hard. I named my daughter after her. Her name is Roxie.",
  ].map((t) => processTurn(s, t).reply);
  // Third reply re-pinned 2026-11-19 (X1 of the X
  // programme): the naming segment's receipt now refers
  // back by the name as told ('roxie' recorded, not the
  // matcher's 'movie'); the recovery S0+S4 built stands —
  // no turn sinks, no garble is spoken.
  assert.deepEqual(replies, ["Ok. Noted.", "Ok.", "Ok. Ok. Her name is roxie."]);
});

test("S4b: the digit pass is the digit token's doing — a nonsense word in its place still sinks (control)", () => {
  const s = newSession();
  assert.equal(processTurn(s, "She acted in a film in 2007.").reply, "Ok. Noted.");
  const s2 = newSession();
  assert.equal(processTurn(s2, "She acted in a film in blorpt.").reply, "Could you put that another way?");
});

test("S4: the feelings-first receipt at the token exit stands for a genuinely unattested sink (E1 cover)", () => {
  // S4(a) routes the P-005 shape onto the ordinary path
  // (its sinking token attests); a turn sunk by a token no
  // source attests still meets E1's receipt at the exit.
  const s = newSession();
  const r = processTurn(s, "I'm so sad because blorpt read an article about a newborn girl who died");
  assert.equal(r.reply, "Ok. Noted. You are sad.");
  assert.equal(r.trace.feelingFirst?.lemma, "sad");
  assert.equal(s.states.find((x) => x.lemma === "sad")?.element, "Metal");
});

// ---------------------------------------------------------------------------
// S5 · Segmentation by default. A multi-sentence turn is
// taken up segment by segment for all turns, not only the
// social fusions (C1) and the failure exits (C2): nothing a
// segment carries is silently dropped, a segment that
// cannot be taken up is skipped and named, and the merged
// parse remains only for the named single-graph cases.
// ---------------------------------------------------------------------------

test("S5: two tellings compose, each receipted on its own content", () => {
  const s = newSession();
  const r = processTurn(s, "I made soup. The soup is hot.");
  // Second receipt re-pinned 2026-11-19 (X1 of the X
  // programme): the soup the second telling predicates is
  // the soup the first telling's event established, and
  // the receipt now shows the link from the record. Each
  // segment is still receipted on its own content first —
  // the link appends to the formed receipt.
  assert.equal(r.reply, "Ok. Noted. Ok. The soup is hot. You told me you made the soup.");
  assert.ok(r.trace.segmentComposition);
});

test("S5: content a merged parse dropped is carried by its segment", () => {
  const s = newSession();
  const r = processTurn(s, "The man bought flowers. The flowers were red.");
  // Re-pinned 2026-11-19 (X1 of the X programme): the
  // flowers' receipt now also links to the buying event
  // that established them, from the record.
  assert.equal(r.reply, "Ok. Noted. Ok. The flowers are red. You told me the man bought the flower.");
});

test("S5: a segment that cannot be taken up is skipped and named, not silently dropped", () => {
  const s = newSession();
  const r = processTurn(s, "He quixoted the fence. The soup is hot.");
  assert.equal(r.reply, "Ok. Noted.");
  assert.ok(r.trace.planNote?.includes("not taken up"), r.trace.planNote);
  assert.ok(r.trace.planNote?.includes("He quixoted the fence."), r.trace.planNote);
});

test("S5: the social fusions compose as before (controls)", () => {
  const s = newSession();
  assert.equal(processTurn(s, "Thank you. Goodbye.").reply, "You are welcome. Goodbye.");
  const s2 = newSession();
  assert.equal(processTurn(s2, "Hello. How are you?").reply, "Hello. I am fine.");
});

test("S5: a single-sentence turn is untouched (control)", () => {
  const s = newSession();
  const r = processTurn(s, "The soup is hot.");
  assert.equal(r.reply, "Ok. Noted.");
  assert.equal(r.trace.segmentComposition, undefined);
});

test("S5: a candidate-carrying clarification pending keeps the merged route (named exception)", () => {
  const s = newSession();
  const q = processTurn(s, "I had a wethr problem.");
  assert.ok(q.reply.startsWith("Did you mean"), q.reply);
  assert.ok(s.conversation.pending?.candidates?.length);
  const r = processTurn(s, "weather. The soup is hot.");
  // The fill is judged against the whole turn: no
  // composition is taken, the pending closes on the fill.
  assert.equal(r.trace.segmentComposition, undefined);
  assert.equal(s.conversation.pending, null);
});
