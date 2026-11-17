/**
 * fork-edu-reach.test.ts — the EDU's larger-graph reach.
 *
 * The EDU's authority is its slice (edu.ts: naming). Its reach
 * (edu-reach.ts) walks the OKU's whole correspondence graph from
 * an emotion's phase: the cycle positions, the cross-domain
 * correspondences filed at the phase, and — the type specimen —
 * the emotion counteractions, 情志相勝 (qíngzhì xiāngshèng):
 * the controlling cycle read through the emotions. None of the
 * counteractions is filed in any emotion entry; they exist only
 * as walks, and they price at "derived", never attested.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { emotionReach } from "../src/fork/edu-reach";
import { emotionReachForWord } from "../src/fork/ledu";

test("anger's reach: the cycle walked from Wood", () => {
  const r = emotionReach("anger")!;
  assert.equal(r.phase, "Wood");
  assert.deepEqual(r.cycle, { generates: "Fire", generatedBy: "Water", controls: "Earth", controlledBy: "Metal" });
});

test("the five classical counteractions exist as walks, in both directions", () => {
  // 悲勝怒 grief overcomes anger · 怒勝思 anger overcomes pensiveness ·
  // 思勝恐 pensiveness overcomes fear · 恐勝喜 fear overcomes joy ·
  // 喜勝憂 joy overcomes worry.
  const pairs: [string, string][] = [
    ["grief", "anger"],
    ["anger", "pensiveness"],
    ["pensiveness", "fear"],
    ["fear", "joy"],
    ["joy", "worry"],
  ];
  for (const [overcomer, overcome] of pairs) {
    assert.ok(emotionReach(overcome)!.counteractedBy.includes(overcomer), `${overcomer} counteracts ${overcome}`);
    assert.ok(emotionReach(overcomer)!.counteracts.includes(overcome), `${overcomer} counteracts ${overcome} (reverse read)`);
  }
});

test("walked relations price at derived; nothing walked calls itself attested", () => {
  const r = emotionReach("anger")!;
  for (const rel of r.relations) {
    if (rel.kind === "corresponds") continue; // filed correspondences carry their own basis
    assert.equal(rel.tier, "derived", `${rel.kind} ${rel.from}→${rel.to}`);
  }
  const counter = r.relations.find((rel) => rel.kind === "counteracted-by" && rel.to === "grief");
  assert.ok(counter);
  assert.match(counter!.basis, /not a filed entry/);
});

test("cross-domain correspondences at the phase come from the table", () => {
  const r = emotionReach("anger")!;
  const season = r.correspondences.find((c) => c.aspect === "season");
  assert.ok(season?.concepts.includes("spring"));
  const direction = r.correspondences.find((c) => c.aspect === "direction");
  assert.ok(direction?.concepts.includes("east"));
});

test("fright: no phase is filed, so no walk exists — the absence is the record", () => {
  const r = emotionReach("fright")!;
  assert.equal(r.phase, undefined);
  assert.deepEqual(r.relations, []);
  assert.deepEqual(r.counteractedBy, []);
});

test("the LEDU carries the reach for a word of language", () => {
  const r = emotionReachForWord("furious")!;
  assert.equal(r.emotion, "anger");
  assert.ok(r.counteractedBy.includes("grief"));
  assert.equal(emotionReachForWord("hot"), undefined);
  assert.equal(emotionReach("not-an-emotion"), undefined);
});
