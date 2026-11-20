/**
 * fork-transcript-slice6.test.ts — the about-phrase
 * representation (Transcript Slice 6, 2026-11-19): the
 * about-topic of a know-question enters the graph.
 *
 * The diagnosis these tests pin (probe report IM3): probe
 * 10, "what do you know about dogs?", parsed to only
 * know/you/what — the about-phrase never entered the graph —
 * so the question collapsed into probe 2's missing-theme
 * decline and the topic the visitor named was lost: its
 * outcome was about nothing instead of about dogs. The
 * mechanism, from the code: 'about' is not in the parser's
 * EN_PREP set and classifies as an adverb, so the
 * wh-question branch's post-gap PP loop stopped at it and
 * dropped the phrase, and the main verb path took the word
 * as a modulator and filed the topic as the verb's THEME.
 *
 * The representation built: a dedicated 'about' relation
 * (sentence.ts) — verb → Earth topic, the node carrying
 * prep "about" for regeneration, deliberately NOT a valency
 * arc (check.ts's ARG_RELATIONS excludes it, as it excludes
 * 'complement'): what a knowing is ABOUT is not what is
 * known. The parse files it at every post-verbal site that
 * takes PPs (the wh-question loops, the main verb path, the
 * embedded-clause argument filler); the topic rides the
 * session's event record in its own field, is filed on the
 * trace (aboutTopic), and generation composes it back, so
 * no form that reaches the machinery drops the phrase.
 *
 * The boundary this slice does NOT cross: what "what do
 * you know?" should ANSWER is an owner's design call,
 * undecided since the diagnostic report. Probe 10's
 * outcome is still the missing-theme decline — Slice 2
 * deliberately left probe 2's behaviour untouched and this
 * slice does too — but the decline is now framed by the
 * topic: its reply and its ground name dogs. Probe 2's own
 * reply is pinned UNCHANGED below.
 *
 * Every expectation was verified against this tree's build
 * before it was pinned.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/fork/session";
import { processTurn } from "../src/fork/turn";
import { parse } from "../src/fork/parse";
import { generate } from "../src/fork/generate";

const PROBE2_REPLY =
  "I can't answer that from what I know: nothing you have told me says what was known.";

function turn(session: ReturnType<typeof newSession>, text: string) {
  return processTurn(session, text);
}

function aboutEdge(text: string) {
  const p = parse(text, "en");
  const edge = p.meaning.edges.find((e) => e.relation === "about");
  const node = edge ? p.meaning.nodes.find((n) => n.id === edge.to) : undefined;
  const root = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  return { p, edge, node, root };
}

test("probe 10 parse: the about-phrase enters the graph under its own relation", () => {
  const { p, edge, node, root } = aboutEdge("what do you know about dogs?");
  assert.ok(edge, "an 'about' edge stands in the graph");
  assert.equal(root?.lemma, "know");
  assert.equal(edge?.from, root?.id);
  assert.equal(node?.lemma, "dog");
  assert.equal(node?.form, "dogs");
  assert.equal(node?.role, "about");
  assert.equal(node?.prep, "about");
  // The questioned theme is still 'what', and 'dog' is NOT
  // filed as the theme: the topic is what the knowing is
  // about, not what is known.
  const theme = p.meaning.edges.find((e) => e.relation === "theme");
  const themeNode = p.meaning.nodes.find((n) => n.id === theme?.to);
  assert.equal(themeNode?.lemma, "what");
  assert.equal(themeNode?.questionWord, true);
});

test("probe 10: the decline the turn reaches is framed by the topic 'dogs'", () => {
  const { reply, trace } = turn(newSession(), "what do you know about dogs?");
  assert.equal(
    reply,
    "I can't answer that from what I know: nothing you have told me says what was known about dogs.",
  );
  assert.notEqual(reply, PROBE2_REPLY, "not the bare probe-2 text: the topic frames it");
  assert.equal(trace.aboutTopic?.topic, "dog");
  assert.equal(trace.aboutTopic?.form, "dogs");
  assert.match(trace.declineReason ?? "", /about-topic is 'dog'/);
  assert.match(trace.parseSummary, /dog/, "the topic is visible in the parse summary");
});

test("probe 2: 'what do you know?' is UNCHANGED — the owner's call stays open", () => {
  const { reply, trace } = turn(newSession(), "what do you know?");
  assert.equal(reply, PROBE2_REPLY);
  assert.equal(trace.aboutTopic, undefined, "no about-phrase, no topic filed");
});

test("probe 10 variant: a grounded entity topic is carried the same way", () => {
  const { reply, trace } = turn(newSession(), "what do you know about oklahoma?");
  assert.equal(
    reply,
    "I can't answer that from what I know: nothing you have told me says what was known about oklahoma.",
  );
  assert.equal(trace.aboutTopic?.topic, "oklahoma");
  assert.match(trace.declineReason ?? "", /about-topic is 'oklahoma'/);
});

test("the topic's own determiner rides the framing ('about the dog')", () => {
  const { reply, trace } = turn(newSession(), "what do you know about the dog?");
  assert.equal(
    reply,
    "I can't answer that from what I know: nothing you have told me says what was known about the dog.",
  );
  assert.equal(trace.aboutTopic?.topic, "dog");
});

test("statement form: 'i know about dogs.' files the topic as about, not as theme", () => {
  const { p, edge, node } = aboutEdge("i know about dogs.");
  assert.ok(edge);
  assert.equal(node?.lemma, "dog");
  assert.equal(
    p.meaning.edges.some((e) => e.relation === "theme"),
    false,
    "no theme is claimed: the sentence does not say what is known",
  );
  // The session's event record carries the topic in its own
  // field, distinct from the theme.
  const session = newSession();
  turn(session, "i know about dogs.");
  const ev = session.events.find((e) => e.verb === "know");
  assert.equal(ev?.about, "dog");
  assert.equal(ev?.theme, undefined);
});

test("round-trip: no form that reaches generation drops the about-phrase", () => {
  assert.equal(generate(parse("what do you know about dogs?", "en")), "What do you know about dogs?");
  assert.equal(generate(parse("i know about dogs.", "en")), "I know about dogs.");
  assert.equal(generate(parse("you know about dogs.", "en")), "You know about dogs.");
  // One clause down: the embedded clause's own about-phrase
  // is composed from its own root, like its other arguments.
  assert.equal(
    generate(parse("i know that you know about dogs.", "en")),
    "I know that you know about dogs.",
  );
});

test("the construction generalises: subject questions and other verbs", () => {
  const who = aboutEdge("who knows about dogs?");
  assert.ok(who.edge, "the subject question carries the about edge too");
  assert.equal(who.node?.lemma, "dog");
  const take = aboutEdge("what do you know about dogs?");
  assert.ok(take.edge, "the know-question carries the about edge");
  // A genuine PP neighbour is untouched: the goal of 'take'
  // still files as goal, not as an about-topic.
  const p = parse("what do people take to the beach?", "en");
  assert.equal(p.meaning.edges.some((e) => e.relation === "about"), false);
  assert.ok(p.meaning.edges.some((e) => e.relation === "goal"), "the goal edge stands as before");
});

test("the tell-about family keeps its readers on the new filing (X2/IMP controls)", () => {
  const s = newSession();
  turn(s, "I put the salt in the soup.");
  assert.equal(turn(s, "Did I tell you about the soup?").reply, "Yes. You told me about the soup.");
  assert.equal(turn(s, "Did I tell you about the garden?").reply, "No. You have not told me about the garden.");
  // The self-presentation request: 'yourself' as a telling's
  // about-topic is its matter, as it was as its theme.
  const s2 = newSession();
  const pres = turn(s2, "I was wondering if you could tell me a bit about yourself?");
  assert.ok(pres.reply.includes("I am AnSci."), pres.reply);
});

test("controls: the Slice 0–5 acceptance replies stand", () => {
  assert.equal(turn(newSession(), "do you know who i am?").reply, "No. You have not told me who you are.");
  assert.equal(turn(newSession(), "do you know my name?").reply, "No. You have not told me your name.");
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
  assert.equal(
    turn(newSession(), "do you know what a dog is?").reply,
    "I can't answer that from what I know: nothing in what I know says what a dog is.",
  );
  assert.equal(turn(newSession(), "your last name is smith.").reply, "I have only the one name, AnSci.");
});
