/**
 * ansci-aspect.test.ts — the aspect feature bundle and dispatcher
 * (WP4 spec, depth programme stage 2): EN construction families,
 * ZH particle mapping, Vendler compatibility, irregular forms.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse";
import { generate } from "../src/ansci/generate";
import { checkSentence } from "../src/ansci/check";
import { enableWordnetLexicon, wordnetVerb } from "../src/ansci/wordnet-lex";
import { bundleConfiguration } from "../src/ansci/aspect";

enableWordnetLexicon(true);

function rootBundle(text: string, lang: "en" | "zh") {
  const p = parse(text, lang);
  const root = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  return { p, bundle: root?.states?.aspect };
}

test("progressive: be + -ing is {ongoing} and round-trips exactly", () => {
  const { p, bundle } = rootBundle("Winter is coming.", "en");
  assert.deepEqual(bundle, { ongoing: true });
  assert.equal(bundleConfiguration(bundle), "progressive");
  assert.equal(generate(p), "Winter is coming.");
});

test("perfect-progressive: have + been + -ing is {perfect, ongoing}", () => {
  const { p, bundle } = rootBundle("She has been baking a cake.", "en");
  assert.deepEqual(bundle, { perfect: true, ongoing: true });
  assert.equal(generate(p), "She has been baking a cake.");
});

test("simple past is {bounded}; simple present is unmarked", () => {
  assert.deepEqual(rootBundle("She baked a cake.", "en").bundle, { bounded: true });
  assert.equal(rootBundle("She bakes a cake.", "en").bundle, undefined);
});

test("ZH particles map to distinct bundle features and regenerate distinctly", () => {
  assert.deepEqual(rootBundle("他去了学校。", "zh").bundle, { bounded: true });
  assert.deepEqual(rootBundle("他吃着饭。", "zh").bundle, { ongoing: true });
  const exp = rootBundle("他去过北京。", "zh");
  assert.deepEqual(exp.bundle, { perfect: true, experiential: true });
  assert.equal(generate(exp.p), "他去过北京。");
});

test("Vendler compatibility: the progressive over a stative is flagged; over an activity it is not", () => {
  const bad = checkSentence(parse("She is knowing the answer.", "en"));
  assert.ok(bad.some((v) => v.name === "aspect-compatibility"), JSON.stringify(bad));
  const ok = checkSentence(parse("She is baking a cake.", "en"));
  assert.ok(!ok.some((v) => v.name === "aspect-compatibility"));
});

test("irregular forms: strong verbs select their attested past and participle", () => {
  assert.equal(wordnetVerb("blow")?.forms.past, "blew");
  assert.equal(wordnetVerb("blow")?.forms.participle, "blown");
  assert.equal(wordnetVerb("write")?.forms.past, "wrote");
  assert.equal(wordnetVerb("write")?.forms.participle, "written");
  assert.equal(wordnetVerb("sing")?.forms.past, "sang");
  assert.equal(wordnetVerb("sing")?.forms.participle, "sung");
  assert.equal(wordnetVerb("send")?.forms.past, "sent");
  assert.equal(wordnetVerb("teach")?.forms.past, "taught");
  // A regular verb keeps its regular forms.
  assert.equal(wordnetVerb("bake")?.forms.past, "baked");
});
