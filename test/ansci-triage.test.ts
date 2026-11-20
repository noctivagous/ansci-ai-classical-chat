/**
 * ansci-triage.test.ts — the review-triage queue machinery (C.6).
 *
 * Bookkeeping only: status separation, the always-review list,
 * seeded stratified sampling at the policy's sizes, the admitted-
 * confidence cap, and the escalation rules. The reviews themselves
 * are human work; nothing here performs one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  admittedConfidence, alwaysReviewQueue, auditSampleSize,
  escalationCheck, stratifiedSample, type ReviewItem,
} from "../src/ansci/triage";

function item(id: string, risk: ReviewItem["risk_class"], stratum = "tools", extra: Partial<ReviewItem> = {}): ReviewItem {
  return {
    item_id: id, stratum, risk_class: risk, rule_id: "R1",
    rule_status: "validated", instance_status: "unreviewed",
    c_source: 0.9, c_rule_calibration: 0.9, c_instance: 0.9,
    ...extra,
  };
}

test("audit sample size: the density queue's ~1,047 needs ~283 at 95% ±5%", () => {
  const n = auditSampleSize(1047);
  assert.ok(n >= 280 && n <= 285, `expected ≈283, got ${n}`);
  assert.equal(auditSampleSize(10), 10, "a small queue is reviewed whole");
  assert.equal(auditSampleSize(0), 0);
});

test("the always-review list is exactly critical + high, whatever their statuses", () => {
  const queue = [
    item("a", "critical"), item("b", "high", "tools", { instance_status: "reviewed-supported" }),
    item("c", "medium"), item("d", "low"),
  ];
  assert.deepEqual(alwaysReviewQueue(queue).map((i) => i.item_id), ["a", "b"]);
});

test("rule status and instance status stay separate; an unreviewed instance is capped below 1.0", () => {
  const q = item("x", "low", "tools", { c_source: 1, c_rule_calibration: 1, c_instance: 1 });
  assert.equal(q.rule_status, "validated");
  assert.equal(q.instance_status, "unreviewed");
  const admitted = admittedConfidence(q);
  assert.ok(admitted < 1, "a validated rule does not make its unreviewed instance verified");
  assert.equal(admitted, 0.99);
  const reviewed = { ...q, instance_status: "reviewed-supported" as const };
  assert.equal(admittedConfidence(reviewed), 1, "the cap lifts only with the instance's own review");
});

test("stratified sampling: seeded, reproducible, medium/low only, minimums respected", () => {
  const queue: ReviewItem[] = [];
  for (let i = 0; i < 600; i++) queue.push(item(`m${i}`, "medium", "tools"));
  for (let i = 0; i < 447; i++) queue.push(item(`l${i}`, "low", "substances"));
  queue.push(item("crit", "critical", "tools"), item("hi", "high", "tools"));
  const s1 = stratifiedSample(queue, { seed: 42 });
  const s2 = stratifiedSample(queue, { seed: 42 });
  assert.deepEqual(s1, s2, "the same seed draws the same sample");
  const all = Object.values(s1.by_stratum).flat();
  assert.ok(!all.includes("crit") && !all.includes("hi"), "critical/high are never sampled — they are always reviewed");
  assert.ok(s1.total >= 270 && s1.total <= 300, `sample ≈283 over 1,047, got ${s1.total}`);
  for (const ids of Object.values(s1.by_stratum)) assert.ok(ids.length >= 5);
});

test("a stratum too small to sample is reported under-tested, not passed over", () => {
  const queue = [item("only", "low", "tiny"), item("a", "low", "big"), item("b", "low", "big"),
    item("c", "low", "big"), item("d", "low", "big"), item("e", "low", "big"), item("f", "low", "big")];
  const s = stratifiedSample(queue, { seed: 7 });
  assert.deepEqual(s.under_tested_strata, ["tiny"]);
  assert.deepEqual(s.by_stratum.tiny, ["only"], "a tiny stratum is taken whole");
});

test("escalation: each C.6 rule suspends its stratum; a clean stratum stands", () => {
  const clean = escalationCheck({ stratum: "tools", sampled: 100, unsupported: 2, contradictions: 0, precision_lower_bound: 0.9, ratified_bar: 0.85 });
  assert.equal(clean.suspended, false);
  const byUnsupported = escalationCheck({ stratum: "tools", sampled: 100, unsupported: 6, contradictions: 0, precision_lower_bound: 0.9, ratified_bar: 0.85 });
  assert.equal(byUnsupported.suspended, true);
  assert.match(byUnsupported.reasons[0], /unsupported/);
  const byContradiction = escalationCheck({ stratum: "tools", sampled: 100, unsupported: 0, contradictions: 2, precision_lower_bound: 0.9, ratified_bar: 0.85 });
  assert.equal(byContradiction.suspended, true);
  const byBound = escalationCheck({ stratum: "tools", sampled: 100, unsupported: 0, contradictions: 0, precision_lower_bound: 0.8, ratified_bar: 0.85 });
  assert.equal(byBound.suspended, true);
});
