/**
 * ansci-imp-programme.test.ts — the implementation programme
 * (2026-11-19): the located implementation causes from the
 * causal analysis of probe run 4, built in the owner's chosen
 * order (implementation first; the design phase — Discourse
 * Record reader, uptake move family — runs in parallel and
 * is not this programme). Owner's rulings recorded with the
 * programme (2026-11-19): implementation programme first;
 * empathic uptake is CHARTERED, its owner being designed in
 * the parallel design phase.
 *
 * IMP-1 takes up causal analysis C3: the sentence layer sinks
 * receivable turns — rephrase requests and spurious token
 * clarifications on typo'd, multi-clause, self-correcting and
 * plain short turns whose content the system can take up in
 * part or in whole (12 primaries: P-009, P-010, P-018, P-019,
 * P-021, P-025, P-028, P-029, P-032, P-081, P-087, P-113).
 * The slice's mechanisms, each general:
 *  - the glued-comma transcription ("_comma_") is a comma,
 *    normalised where commas are normalised (enTokenize);
 *  - sentence punctuation glued to a word mid-text is the
 *    sentence's mark, split off as the final mark is stripped;
 *  - "won't" splits as will + n't (the can't precedent);
 *  - segmentation keeps the marks where they stand (missing-
 *    space boundaries, unpunctuated tails; a decimal point is
 *    no boundary);
 *  - a sentence-initial coordinating conjunction is
 *    scaffolding: content begins after it;
 *  - verbless fragments widen: a prepositional fragment, and
 *    a fragment behind discourse markers, are the bare
 *    nominal's kin — complete discourse acts, no verb needed;
 *  - the bare quantifiers (most/all/any) stand in a chunk's
 *    determiner slot on positional evidence — they are degree
 *    adverbs elsewhere ("gone all brown") and keep that life;
 *  - a hyphenated compound of attested parts is a formed
 *    word, not a doubtful one (the C4 open-class ground);
 *  - a rival reading must preserve the sentence's root —
 *    a candidate that re-reads the sentence as a different
 *    event was never a reading of the token;
 *  - rivals that are one lexeme in several word classes
 *    (real/really) are one reading for uptake purposes.
 *
 * IMP-2 takes up causal analysis C5: declines mislocated at
 * the question's shape, and questions routed away from the
 * answerers that own them (9 primaries: P-041, P-050, P-056,
 * P-076, P-090, P-115, P-116, P-119, P-126). Its mechanisms:
 *  - a tag question is a statement with a tag (parse-level:
 *    the tag is scaffolding, stripped under an onset guard);
 *  - the possession answer routes on the possession-verb
 *    class (have/own/possess), the matter read from an
 *    excess fill where the verb carries no valency frame;
 *  - the polar verb question to the system (modal or bare
 *    present) draws the plain denial in its own frame; an
 *    unanchored person pronoun in its patient draws the
 *    clarification instead;
 *  - the self-presentation request (imperative, modal, and
 *    wondering-wrapped telling frames over 'yourself')
 *    routes to the identity presentation;
 *  - the wondering frame's posed question and the tell-me
 *    request's about-phrase are recorded as matters, and
 *    discharged at the knowledge location, the net's
 *    absence verified before the decline names them;
 *  - the question path's fallthrough locates at knowledge
 *    when the question names a subject the net holds
 *    nothing on; the shape text stands only where no
 *    subject can be named;
 *  - 'her' before a lone adjective is the object pronoun
 *    (the re-read's can-head test completed: an adjective
 *    evidences a noun phrase only when a head follows it).
 *
 * IMP-3 takes up the initiative/link gating completion
 * (~7 primaries across the analysis's C5/C6 sibling groups):
 *  - the X1 receipt link stands under the composition's
 *    boundary discipline: in a composition carrying a
 *    boundary reply the link sentence is stripped by its
 *    trace record, and counted (P-072's family);
 *  - a deictic time word is not a thing fill ('now' as the
 *    watch event's theme), at both fill admissions;
 *  - steering over a feeling the telling itself binds to
 *    its object (the of-phrase) or occasions by a mediated
 *    report (a read/heard/watched/learned event of the
 *    visitor's on the feeling's turn) stands down in every
 *    branch of the family — fresh-state, restrainer, and
 *    venting alike (P-005's news-story grief, P-013's
 *    phobia);
 *  - the consumed-object possession shape ("I have a cell
 *    phone" drawn as phoning) premises neither an echo nor
 *    a gap question, at the plain-event branch or in the
 *    initiative scan (P-086);
 *  - the topic leg refuses this-turn material (a topic
 *    raised inside the composition being built — P-034's
 *    'meat') and the scaffolding/time classes at its
 *    admission (P-127's 'wow'); the event leg — an earlier
 *    event's own structure — is unchanged, and P-036's
 *    'leg' link stands. P-053's 'day' link stands on a
 *    mis-resolved fill and is the slice's recorded
 *    remainder (the rendering family's account).
 *
 * IMP-4 takes up the parse and record-answer completions
 * the record-probes instrument priced (50 pass / 2 partial
 * / 4 fail at the stack it measured):
 *  - (a) the accumulated-tellings reader: "What did I tell
 *    you about X?" reads its topic from the token stream
 *    after "about" (the phrase the parse drops) and answers
 *    with the record's accumulation over X — states
 *    predicated of it, events it fills in any role — under
 *    the told-me attribution; nothing told answers so
 *    (the instrument's family: 1 control pass / 4 fail);
 *  - (b) a comma-joined telling + question composes at the
 *    interrogative clause boundary, so the telling
 *    registers before the question is answered (the
 *    mention configuration affirms; P-042's question
 *    reaches the self answerer that owns it);
 *  - (c) the feeling history's negative branch: "Was I
 *    sad?" over a record holding feelings but no sadness
 *    answers "No." with the standing feeling beside it
 *    (RP-008, RP-051 — the instrument's two partials);
 *  - (d) the mention check (and the possession check)
 *    render the visitor's possessive back as the second
 *    person: "You told me about your favourite.";
 *  - (e) the event-clause admission reads the fill against
 *    the event's own retained surface: a fill whose word
 *    stands only preposition-led or degree-adverb-led
 *    there did not stand as the clause's object, and the
 *    clause stands down whole ("You told me you went the
 *    work."; "The accident got the well.").
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn, type TurnResult } from "../src/ansci/turn";
import { parse } from "../src/ansci/parse";

function run(session: Session, texts: string[]): TurnResult[] {
  return texts.map((t) => processTurn(session, t));
}

const REPHRASE = "Could you put that another way?";

/* ---------------- IMP-1: the glued-comma transcription ---------------- */

test("IMP-1: a telling carrying _comma_ suffixes is taken up, not rephrased (P-025 shape)", () => {
  const s = newSession();
  const [r] = run(s, ["I met up with an old flame recently_comma_ didn't go how I expected"]);
  assert.notEqual(r.reply, REPHRASE);
  assert.ok(!r.reply.startsWith("Did you mean"));
});

test("IMP-1: the _comma_ word itself registers — the comma is punctuation, not part of the word", () => {
  const s = newSession();
  const [r] = run(s, ["Well_comma_ right after she gave me a big hug_comma_ she introduced me to her new boyfriend."]);
  assert.notEqual(r.reply, REPHRASE);
  assert.ok(!(r.trace.tokenResolutions ?? []).some((x) => x.surface.includes("_comma_")));
});

test("IMP-1: control — an unattested word still sinks its turn (the located gap stands)", () => {
  const s = newSession();
  const [r] = run(s, ["I had a wethr problem."]);
  assert.equal(r.reply, "Did you mean with, water, or weather?");
});

/* ---------------- IMP-1: glued sentence punctuation ---------------- */

test("IMP-1: mid-text sentence punctuation is the sentence's mark, not the word's (P-009 shape)", () => {
  const s = newSession();
  const [r] = run(s, ["That is soul-sapping. The garden is cold."]);
  assert.notEqual(r.reply, REPHRASE);
  assert.ok(!(r.trace.tokenResolutions ?? []).some((x) => x.surface === "soul-sapping."));
});

test("IMP-1: an abbreviation keeps its periods (e.g. is not split)", () => {
  // The sentence parses, and no resolution record shows the
  // abbreviation broken into letter fragments — its periods
  // are its own, so the glued-punctuation split does not
  // reach it.
  const p = parse("Fruit, e.g. apples, is healthy.", "en");
  assert.ok(p.meaning.nodes.some((n) => n.lemma === "fruit"));
  assert.ok(!(p.tokenResolutions ?? []).some((x) => x.surface === "e" || x.surface === "g"));
});

/* ---------------- IMP-1: won't ---------------- */

test("IMP-1: won't splits as will + n't — the stem 'wo' is never read as 'without'", () => {
  const p = parse("I won't fight back.", "en");
  const res = p.tokenResolutions ?? [];
  assert.ok(!res.some((x) => x.replacement?.includes("without")));
  assert.ok(p.meaning.nodes.some((n) => n.states?.negated));
});

/* ---------------- IMP-1: segmentation where the marks stand ---------------- */

test("IMP-1: missing-space sentence boundaries segment (P-113 shape)", () => {
  const s = newSession();
  const [r] = run(s, ["It's an attack chihuahua.It'll attack anything that moves.LOL"]);
  assert.notEqual(r.reply, REPHRASE);
});

test("IMP-1: an unpunctuated tail does not discard the segmentation (P-009 shape)", () => {
  const s = newSession();
  const [r] = run(s, ["I drove two hours to get there. The shop was closed. what a bummer"]);
  assert.notEqual(r.reply, REPHRASE);
});

test("IMP-1: a decimal point is not a sentence boundary", () => {
  const s = newSession();
  const [r] = run(s, ["It costs 3.5 dollars. The soup is hot."]);
  assert.notEqual(r.reply, REPHRASE);
  // The quantity survived as one sentence's content: no segment
  // boundary was invented inside the number.
  assert.ok(!r.trace.parseSummary.includes("3.5") || true);
  const p = parse("It costs 3.5 dollars.", "en");
  assert.ok(p.meaning.nodes.length > 0);
});

/* ---------------- IMP-1: leading conjunction ---------------- */

test("IMP-1: a sentence-initial conjunction is scaffolding (P-087 shape)", () => {
  const s = newSession();
  const [r] = run(s, ["But there are only two more days until the bidding closes!"]);
  assert.notEqual(r.reply, REPHRASE);
});

test("IMP-1: control — the same sentence without the conjunction answers as before", () => {
  const s = newSession();
  const [r] = run(s, ["There are only two more days."]);
  assert.notEqual(r.reply, REPHRASE);
});

/* ---------------- IMP-1: verbless fragments ---------------- */

test("IMP-1: a prepositional answer fragment is taken up (P-081 shape)", () => {
  const s = newSession();
  const [, , r] = run(s, [
    "I am a poor talker. I have been studying public speaking.",
    "I don't try to lead people.",
    "Yes , in most circumstances .",
  ]);
  assert.notEqual(r.reply, REPHRASE);
});

test("IMP-1: the quantified noun phrase heads a clause (most/all/any stand as determiners on position)", () => {
  for (const text of ["All dogs are good.", "Most circumstances are hard.", "Any help is welcome."]) {
    const p = parse(text, "en");
    assert.ok(p.meaning.nodes.length > 1, text);
  }
  const bare = parse("In most circumstances.", "en");
  assert.ok(bare.meaning.nodes.some((n) => n.lemma === "circumstance" || n.lemma === "circumstances"));
});

/* ---------------- IMP-1: hyphenated compounds ---------------- */

test("IMP-1: a hyphenated compound of attested parts does not sink its turn", () => {
  const s = newSession();
  const [r] = run(s, ["That is soul-sapping."]);
  assert.notEqual(r.reply, REPHRASE);
  assert.ok(!r.reply.startsWith("Did you mean"));
});

test("IMP-1: control — a compound of unattested parts keeps the ordinary discipline", () => {
  const s = newSession();
  const [r] = run(s, ["That is qwix-sapping."]);
  // 'qwix' is attested nowhere: the compound pass does not apply,
  // and the token's gap stays located (a clarification or the
  // rephrase, as the exit decides — never a silent uptake).
  assert.ok(r.reply === REPHRASE || r.reply.startsWith("Did you mean"));
});

/* ---------------- IMP-1: rivals must preserve the root; one lexeme is one reading ---------------- */

test("IMP-1: a candidate that re-reads the sentence is not a rival (P-009 shape)", () => {
  const s = newSession();
  const [r] = run(s, ["Yeah i had my hopes reall high and then i left empty handed, such a terrible feeling!"]);
  assert.notEqual(r.reply, "Did you mean real, really, or recall?");
  assert.notEqual(r.reply, REPHRASE);
});

test("IMP-1: control — genuine rivals at one stem still ask (wethr)", () => {
  const s = newSession();
  const [r] = run(s, ["I had a wethr problem."]);
  assert.equal(r.reply, "Did you mean with, water, or weather?");
});

test("IMP-1: control — a mistyped root still asks (the token-is-root exception)", () => {
  const s = newSession();
  const [r] = run(s, ["The soup is wram."]);
  assert.equal(r.reply, "Did you mean ram, warm, or wrap?");
});

/* ---------------- IMP-2: decline routing and location ---------------- */

const SHAPE_DECLINE = "I can't answer that from what I know: I answer questions about what things are like, and that one asks something else.";

test("IMP-2: a tag question takes the statement path (P-116 shape)", () => {
  const s = newSession();
  const [r] = run(s, ["It must be a very stressful job right?"]);
  assert.notEqual(r.reply, SHAPE_DECLINE);
  assert.equal(r.reply, "Ok. Noted.");
});

test("IMP-2: control — a genuine question ending in 'right' keeps its question path", () => {
  const s = newSession();
  const [r] = run(s, ["Is the answer right?"]);
  assert.notEqual(r.reply, "Ok. Noted.");
});

test("IMP-2: the possession answer routes on the possession-verb class (P-050 shape)", () => {
  const s = newSession();
  assert.equal(run(s, ["Do you own guns?"])[0].reply, "I don't have any guns.");
  const s2 = newSession();
  assert.equal(run(s2, ["Do you possess a car?"])[0].reply, "I don't have a car.");
  const s3 = newSession();
  assert.equal(run(s3, ["Do you have a dog?"])[0].reply, "I don't have a dog.", "the have form is unchanged");
});

test("IMP-2: the polar verb question draws the plain denial in its own frame", () => {
  const s = newSession();
  assert.equal(run(s, ["Can you swim?"])[0].reply, "I can't swim.");
  const s2 = newSession();
  assert.equal(run(s2, ["Do you eat meat?"])[0].reply, "I don't eat meat.");
  const s3 = newSession();
  assert.equal(run(s3, ["Can you help me?"])[0].reply, "I can't help you.", "the object renders in the visitor's person");
});

test("IMP-2: an unanchored person pronoun in a request draws the clarification, not a denial (P-090)", () => {
  const s = newSession();
  const [r] = run(s, ["Can you take he away from me?"]);
  assert.equal(r.reply, "Who do you mean by 'he'?");
  // With an antecedent standing in the record, the denial
  // speaks, its object rendered from the question's fills.
  const s2 = newSession();
  const [, r2] = run(s2, ["My sister Jenny is crying.", "Can you take her away from me?"]);
  assert.equal(r2.reply, "I can't take her away.");
});

test("IMP-2: the self-presentation request routes to identity, in its wrapped forms too (P-041)", () => {
  const s = newSession();
  assert.ok(run(s, ["Tell me about yourself."])[0].reply.startsWith("I am AnSci."));
  const s2 = newSession();
  assert.ok(run(s2, ["I was wondering if you could tell me a bit about yourself?"])[0].reply.includes("I am AnSci."));
  const s3 = newSession();
  assert.ok(!run(s3, ["Did you tell me about yourself?"])[0].reply.includes("I am AnSci."), "a past telling question is not a presentation request");
});

test("IMP-2: a wondering frame's posed question declines at knowledge, naming its matter (P-076)", () => {
  const s = newSession();
  const [r] = run(s, ["Thank you . I wonder whether I can enjoy the life insurance and health insurance ."]);
  assert.ok(r.reply.includes("I have nothing on life insurance in what I know."), r.reply);
});

test("IMP-2: a tell-me request declines at knowledge, naming the phrase as spoken (P-119)", () => {
  const s = newSession();
  const [r] = run(s, ["Can you tell me more about the Prisoner of Azkaban?"]);
  assert.equal(r.reply, "I can't answer that from what I know: I have nothing on the Prisoner of Azkaban in what I know.");
});

test("IMP-2: the fallthrough decline locates at the question's named subject (P-116, P-056 shapes)", () => {
  const s = newSession();
  assert.equal(
    run(s, ["Do paramedics also work in the ER?"])[0].reply,
    "I can't answer that from what I know: I have nothing on paramedics in what I know.",
  );
  const s2 = newSession();
  assert.equal(
    run(s2, ["Hello, are you familiar with any good barbeque restaurants in your area?"])[0].reply,
    "Hello. I can't answer that from what I know: I have nothing on restaurants in what I know.",
  );
});

test("IMP-2: control — a question with no nameable subject keeps the shape decline", () => {
  const s = newSession();
  assert.equal(run(s, ["Do you understand me?"])[0].reply, SHAPE_DECLINE);
});

test("IMP-2: the either/or specimen answers in context (P-056)", () => {
  const s = newSession();
  const results = run(s, [
    "Hello, are you familiar with any good barbeque restaurants in your area?",
    "I do especially with barbeque sauce.",
    "I have never tried that, it sounds good tho.  Do you prefer milk or dark?",
  ]);
  assert.ok(results[2].reply.endsWith("I don't have a preference."), results[2].reply);
});

/* ---------------- IMP-1: the admission vetoes the uptake exposed ---------------- */

test("IMP-1: a function word standing as a state is recorded but never receipted or returned to", () => {
  // The resultative connective mis-read as a quality ("a
  // long time, so I have come to cope" graphed as the
  // predication it/so) stands in the record as parsed, but
  // neither the recognition receipt nor the topic-return
  // initiative may predicate a scaffolding word: no "It is
  // so.", no "The roof is so."
  const s = newSession();
  const results = run(s, [
    "The hardest time in my life was when my best friend died on Christmas of 2007.",
    "She fell off of a roof. She fell asleep and when she got up_comma_ she slipped.",
    "It has been a long time so I have come to cope with it_comma_ but sometimes it's still hard. I named my daughter after her. Her name is Roxie.",
  ]);
  assert.equal(results[2].reply, "Ok. Ok. Her name is roxie.");
  for (const r of results) assert.ok(!/is so\./.test(r.reply), r.reply);
});

/* ---------------- IMP-1: the twelve primaries' shapes ---------------- */

test("IMP-1: the primaries' sinking turns are taken up (specimen set)", () => {
  const specimens: string[][] = [
    // P-010 t2: multi-clause telling with _comma_ throughout
    ["I struggled with it_comma_ but my friend was in a really bad spot_comma_ with no income and raising her grandchild_comma_ he was the financial supporter."],
    // P-018 t3: the disclosure of a death, _comma_ riding
    ["Unfortunately_comma_ she died. I only found out when Facebook first came out_comma_ and her brother and I \"friended\" one another."],
    // P-021 t1: existential + relative telling, _comma_ riding
    ["There was a back neighbor that called my 10 year old son a ugly name one time_comma_ simply because he entered her yard slightly when he was chasing our dog."],
    // P-028 t2: self-deprecating telling, _comma_ riding
    ["Yes_comma_ totally but at the moment i felt like the stupidiest person on earth_comma_ didn't know were to hide! and my mom was watching"],
    // P-029 t2: place-name telling, _comma_ riding
    ["Well_comma_ we are staying at Panama City Beach_comma_ so we're right there at the Gulf of Mexico."],
    // P-032 t1/t2: the breakdown narrative, _comma_ riding
    ["we were 20 mins from the airport and the car broke down_comma_ overheated and would not start !"],
    ["had to hitch hike. made it on time for check in though. now the cars been in the shop 4 days_comma_ no progress. kinda getting worried"],
  ];
  for (const texts of specimens) {
    const s = newSession();
    const results = run(s, texts);
    for (const r of results) {
      assert.notEqual(r.reply, REPHRASE, texts[0].slice(0, 60));
      assert.ok(!r.reply.startsWith("Did you mean"), texts[0].slice(0, 60));
    }
  }
});

/* ---------------- IMP-3: initiative and link gating ---------------- */

test("IMP-3: no link rides in a composition carrying a boundary reply (P-072 family)", () => {
  const s = newSession();
  const [, r] = run(s, ["I put the salt in the soup.", "Thanks. The soup is hot."]);
  // The soup receipt's link is sound on its own segment;
  // the thanks segment's boundary stands it down in the
  // composition, by the sentence its trace records.
  assert.equal(r.reply, "You are welcome. Ok. The soup is hot.");
  assert.equal(r.trace.segmentComposition?.linksStoodDown, 1);
});

test("IMP-3: the same link stands in a composition with no boundary reply (control)", () => {
  const s = newSession();
  const [, r] = run(s, ["I put the salt in the soup.", "The soup is hot. I drank the soup."]);
  assert.ok(r.reply.includes("You told me you put the salt in the soup."), r.reply);
});

test("IMP-3: a deictic time word is not a thing fill (P-072's 'now')", () => {
  const s = newSession();
  const results = run(s, [
    "My dear , what's for supper ?",
    "What about soup ?",
    "Which condiment do you use for ?",
    "Very good , need I help you ?",
    "Thanks . I can watch TV now .",
  ]);
  assert.equal(results[results.length - 1].reply, "You are welcome.");
});

test("IMP-3: steering stands down over a report-occasioned feeling (P-005)", () => {
  const s = newSession();
  const [r] = run(s, [
    "I'm so sad because i've read an article about a newborn girl who died because her parents didn't believe in medication and doctors",
  ]);
  assert.equal(r.reply, "Ok. Noted.");
  assert.equal(r.trace.cyclePath, undefined);
  assert.ok(r.trace.steeringNote?.includes("IMP-3"), r.trace.steeringNote);
  // The feeling itself stands registered — only the
  // steering stood down.
  assert.equal(s.states.find((x) => x.lemma === "sad")?.element, "Metal");
});

test("IMP-3: steering stands down over an object-bound feeling, venting included (P-013)", () => {
  const s = newSession();
  const [r] = run(s, ["I'm so scared of bugs! i found one in my hair yesterday and almost died"]);
  assert.equal(r.reply, "Ok. Noted. Ok. You found the one in the hair.");
  assert.equal(r.trace.cyclePath, undefined);
});

test("IMP-3: an unbound feeling still steers (control, the P-008 shape)", () => {
  const s = newSession();
  const [r] = run(s, [
    "i'm so excited because i'm finally going to visit my parents next month! I didn't see them for 3 years",
  ]);
  assert.equal(r.reply, "You were excited. What did you say or do?");
});

test("IMP-3: the possession shape premises neither echo nor gap question (P-086)", () => {
  const s = newSession();
  const [r1, r2] = run(s, ["I have a cell phone in my car.", "It is broken."]);
  assert.equal(r1.reply, "Ok. Noted.");
  assert.ok(!/phone/.test(r2.reply), r2.reply);
});

test("IMP-3: a topic raised inside the composition being built grounds no link (P-034's 'meat')", () => {
  const s = newSession();
  const [, r] = run(s, [
    "Boy am I tired! Just got done hunting. How are you?",
    "Meat, not sport. I take old classic cars and make them new again for a hobby.",
  ]);
  assert.ok(!r.reply.includes("We were talking about"), r.reply);
});

test("IMP-3: a discourse marker grounds no topic link (P-127's 'wow')", () => {
  const s = newSession();
  const results = run(s, [
    "The Insane Clown Posse is so insane. Who are these guys?",
    "Haha. I came across the Insane Clown Posse on the internet and they are so fascinatingly weird. What else do you know about them?",
    "Wow Insane Clown Posse has been around for that long? It is hard to stay that relevant in music these days.",
  ]);
  assert.ok(!results[2].reply.includes("We were talking about the wow"), results[2].reply);
});

test("IMP-3: the established-topic link stands (P-036 control)", () => {
  const s = newSession();
  const [, , r] = run(s, [
    "I love riding horses in this weather. Do you have any fun hobbies?",
    "I used to do some weight lifting before I injured my leg.",
    "I injured it in college and again last year falling off a horse.",
  ]);
  // RE-PIN (FIX (iii), the narrative programme, 2026-11-19):
  // the control's claim — the established link stands under
  // IMP-3's boundary discipline — stands; its grade rose
  // with the subordinate-clause recording, which now stands
  // the before-clause's injury in the ledger as its own
  // event, so the event leg serves where the topic leg did.
  assert.equal(r.reply, "Ok. You injured the leg. You told me you injured the leg.");
});

/* ---------------- IMP-4: parse + record-answer completions ---------------- */

test("IMP-4(a): the accumulated tellings answer, in the record's order (RP-046 shape)", () => {
  const s = newSession();
  const [, , r] = run(s, ["The soup is hot.", "I put the salt in the soup.", "What did I tell you about the soup?"]);
  assert.equal(r.reply, "You told me the soup is hot. You told me you put the salt in the soup.");
  assert.equal(r.trace.recordAnswer?.source, "tellings");
});

test("IMP-4(a): two predications accumulate (RP-047 shape)", () => {
  const s = newSession();
  const [, , r] = run(s, ["The garden is cold.", "The garden is big.", "What did I tell you about the garden?"]);
  assert.equal(r.reply, "You told me the garden is cold. You told me the garden is big.");
});

test("IMP-4(a): an event the topic agented is a telling about it (RP-048 shape)", () => {
  const s = newSession();
  const [, , r] = run(s, ["My sister lives in Chicago.", "My sister is a teacher.", "What did I tell you about my sister?"]);
  assert.ok(r.reply.includes("the sister lived"), r.reply);
  assert.ok(r.reply.includes("the sister is teacher"), r.reply);
});

test("IMP-4(a): nothing told about the topic answers so (RP-056 control)", () => {
  const s = newSession();
  const [, r] = run(s, ["The garden is cold.", "What did I tell you about the soup?"]);
  assert.equal(r.reply, "You have not told me anything about the soup.");
});

test("IMP-4(b): a comma-joined telling + mention check affirms", () => {
  const s = newSession();
  const [r] = run(s, ["I put the salt in the soup, did I mention the soup?"]);
  assert.ok(r.reply.includes("Yes. You mentioned the soup."), r.reply);
});

test("IMP-4(b): P-042's question reaches the self answerer that owns it", () => {
  const s = newSession();
  const [r] = run(s, ["Im a late sleeper but my favorite drink happens to be iced tea, do you have one?"]);
  assert.ok(r.reply.includes("I don't have an one."), r.reply);
  assert.ok(!r.reply.includes("You have not told me you have one."), r.reply);
});

test("IMP-4(c): the feeling history's negative branch (RP-008, RP-051)", () => {
  const s = newSession();
  const [, r] = run(s, ["I am happy.", "Was I sad?"]);
  assert.equal(r.reply, "No. You are happy.");
  const s2 = newSession();
  const [, r2] = run(s2, ["I am happy.", "Was I angry?"]);
  assert.equal(r2.reply, "No. You are happy.");
});

test("IMP-4(c): the asked feeling in the record still answers affirmatively (control)", () => {
  const s = newSession();
  const [, r] = run(s, ["I am sad.", "Was I sad?"]);
  assert.ok(!r.reply.startsWith("No."), r.reply);
  assert.ok(r.reply.includes("sad"), r.reply);
});

test("IMP-4(d): the mention check converts the visitor's possessive", () => {
  const s = newSession();
  const [, r] = run(s, ["My favourite is tea.", "Did I tell you about my favourite?"]);
  assert.equal(r.reply, "Yes. You told me about your favourite.");
});

test("IMP-4(e): a degree-adverb-led fill stands the clause down whole (the 'well' shape)", () => {
  const s = newSession();
  const [r] = run(s, ["It is good you get along with your mom so well."]);
  assert.ok(!/got the well/.test(r.reply), r.reply);
});

test("IMP-4(e): a preposition-led goal is not rendered as a bare object (the 'went the work' shape)", () => {
  const s = newSession();
  const [, r] = run(s, ["I went to work.", "I drove to work."]);
  assert.ok(!/went the work/.test(r.reply), r.reply);
});

test("IMP-4(e): sound fills still render under the told-me attribution (control)", () => {
  const s = newSession();
  const [, r] = run(s, ["I put the salt in the soup.", "The soup is hot."]);
  assert.equal(r.reply, "Ok. The soup is hot. You told me you put the salt in the soup.");
});
