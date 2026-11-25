/**
 * ansci-structured-entities.test.ts — the LUIS prebuilt
 * walk's landings: ordinals, currency, percentage, email,
 * URL and phone recognition, each where the architecture
 * already has a home for it. No model, no gazetteer, no
 * network — closed tables and structural patterns only.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { parse } from "../src/ansci/parse";
import { splitTurnSegments } from "../src/ansci/turn";
import {
  classifyStructuredToken,
  isEmailAddress,
  isPhoneNumber,
  isUrl,
} from "../src/ansci/structured-tokens";
import {
  normaliseKind,
  parseNumberToken,
  parseOrdinalToken,
  pluraliseKind,
  renderQuantity,
} from "../src/ansci/quantification-language";
import { currentQuantity } from "../src/ansci/quantification";

function releases(session: ReturnType<typeof newSession>, text: string) {
  const { reply, trace } = processTurn(session, text);
  return { reply, trace };
}

function unresolvedFor(text: string) {
  const p = parse(text, "en");
  return (p.tokenResolutions ?? []).filter((r) => r.outcome === "unresolved");
}

/* ---------------- the classifiers ---------------- */

test("email: addresses match, lookalikes do not", () => {
  assert.equal(isEmailAddress("sam@example.com"), true);
  assert.equal(isEmailAddress("sam.jones@mail.example.co.uk"), true);
  assert.equal(isEmailAddress("sam@example"), false);
  assert.equal(isEmailAddress("sam.example.com"), false);
  assert.equal(isEmailAddress("@example.com"), false);
});

test("url: domains and http urls match, versions do not", () => {
  assert.equal(isUrl("example.com"), true);
  assert.equal(isUrl("https://example.com/a?b=c"), true);
  assert.equal(isUrl("2.0"), false);
  assert.equal(isUrl("apples"), false);
});

test("phone: digit strings of call length match, years and counts do not", () => {
  assert.equal(isPhoneNumber("555-123-4567"), true);
  assert.equal(isPhoneNumber("+1-555-123-4567"), true);
  assert.equal(isPhoneNumber("2026"), false);
  assert.equal(isPhoneNumber("12345"), false);
  assert.equal(isPhoneNumber("abc"), false);
});

test("classification order: an address is email, never url", () => {
  assert.equal(classifyStructuredToken("sam@example.com"), "email");
  assert.equal(classifyStructuredToken("example.com"), "url");
  assert.equal(classifyStructuredToken("555-123-4567"), "phone");
  assert.equal(classifyStructuredToken("apples"), undefined);
});

/* ---------------- ordinals ---------------- */

test("ordinals: words and valid digit forms read as rank", () => {
  assert.equal(parseOrdinalToken("first"), 1);
  assert.equal(parseOrdinalToken("twentieth"), 20);
  assert.equal(parseOrdinalToken("2nd"), 2);
  assert.equal(parseOrdinalToken("21st"), 21);
  assert.equal(parseOrdinalToken("11st"), undefined);
  assert.equal(parseOrdinalToken("12nd"), undefined);
  assert.equal(parseOrdinalToken("13rd"), undefined);
  assert.equal(parseOrdinalToken("apple"), undefined);
  assert.equal(parseNumberToken("first"), undefined);
});

test("ordinals never name a counted kind and never ask for help", () => {
  assert.equal(unresolvedFor("the second apple is green.").length, 0);
  const s = newSession();
  releases(s, "the second apple is green.");
  assert.ok(s.states.some((st) => st.lemma === "green"), "the predication stands");
  assert.ok(!s.states.some((st) => st.lemma === "second"), "the ordinal files no state");
});

/* ---------------- currency ---------------- */

test("currency: the sign, words and slang name the dollar kind", () => {
  assert.equal(normaliseKind("$"), "dollar");
  assert.equal(normaliseKind("bucks"), "dollar");
  assert.equal(normaliseKind("dollars"), "dollar");
  assert.equal(normaliseKind("cents"), "cent");
  const s = newSession();
  releases(s, "i have $5.");
  assert.equal(currentQuantity(s, "you", "dollar")?.amount, 5);
  // "Bucks" the slang maps at the kind level; as a sentence,
  // "bucks" takes the verb slot ("i have five bucks" reads as
  // "i buck" — the parser's verb-slot resolution, unchanged
  // here), so the turn-level pin uses "dollars", which draws
  // the ordinary quantity shape.
  const words = newSession();
  releases(words, "i have five dollars.");
  assert.equal(currentQuantity(words, "you", "dollar")?.amount, 5);
  const cents = newSession();
  releases(cents, "i have fifty cents.");
  assert.equal(currentQuantity(cents, "you", "cent")?.amount, 50);
});

/* ---------------- percentage ---------------- */

test("percentage: the sign and the word file the percent kind", () => {
  assert.equal(normaliseKind("%"), "percent");
  assert.equal(normaliseKind("percentage"), "percent");
  assert.equal(renderQuantity(50, "percent"), "fifty percent");
  const sign = newSession();
  releases(sign, "i have 50%.");
  assert.equal(currentQuantity(sign, "you", "percent")?.amount, 50);
  const word = newSession();
  releases(word, "i have fifty percent.");
  assert.equal(currentQuantity(word, "you", "percent")?.amount, 50);
});

/* ---------------- contact tokens in turns ---------------- */

test("contact tokens pass the token layer intact and stand as entities", () => {
  for (const text of [
    "my email is sam@example.com.",
    "call me at 555-123-4567.",
    "the site is example.com.",
  ]) {
    assert.equal(unresolvedFor(text).length, 0, text);
    const p = parse(text, "en");
    const lemmas = p.meaning.nodes.map((n) => n.lemma);
    assert.ok(
      lemmas.some((l) => l.includes("sam@") || l.includes("555") || l.includes("example.com")),
      `${text}: the surface stands whole in the graph`,
    );
  }
});

test("tens words are numerals: fifty files as a number", () => {
  assert.equal(parseNumberToken("fifty"), 50);
  assert.equal(parseNumberToken("ninety"), 90);
  const s = newSession();
  releases(s, "i have fifty apples.");
  assert.equal(currentQuantity(s, "you", "apple")?.amount, 50);
});

test("segmentation keeps addresses and domains whole", () => {
  assert.deepEqual(splitTurnSegments("my email is sam@example.com."), ["my email is sam@example.com."]);
  assert.deepEqual(splitTurnSegments("the site is example.com."), ["the site is example.com."]);
  // A missing space after a period still breaks (the IMP-1
  // standing, unchanged): the guard only covers a dot
  // followed by a lowercase letter inside a matched span.
  assert.ok(splitTurnSegments("i like apples.Oranges are good.").length > 1);
});

test("a stated email is accepted and recorded, not clarified", () => {
  const s = newSession();
  const { reply, trace } = releases(s, "my email is sam@example.com.");
  assert.ok(!reply.startsWith("Could you put that another way?"), reply);
  assert.ok(
    s.entities.some((e) => e.lemma === "sam@example.com"),
    "the address stands in the entity record",
  );
  assert.equal(trace.declineReason, undefined);
});
