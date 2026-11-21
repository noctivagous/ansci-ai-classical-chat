/**
 * ansci-capability-registry.test.ts — the lack-machinery
 * slice, Parts A + B (owner's commission, 2026-11-20):
 * the capability registry as data, the capability need
 * kind, and the pure audit.
 *
 * The registry's discipline is what is pinned: every
 * entry names real code (verified here against the
 * sources themselves, not taken on the registry's word),
 * every holder is a unit that stands on the map, no
 * placeholder seat is registered as a holding, and the
 * audit's three verdicts each rest on a checked list
 * that names what was checked, in order.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  CAPABILITY_REGISTRY,
  UNBUILT_CAPABILITY_SEATS,
  allCapabilities,
  auditCapability,
  capabilityById,
  unbuiltSeatFor,
} from "../src/ansci/capability-registry";
import { NEED_KINDS, needKind, openProblem } from "../src/ansci/problem-records";
import { newSession } from "../src/ansci/session";

const ROOT = process.cwd();

test("the registry: exactly the verified holdings, each with holder and code pointer", () => {
  assert.deepEqual(
    CAPABILITY_REGISTRY.map((c) => c.id),
    [
      "quantity-ledger",
      "lexicon-lookup",
      "graph-path-walk",
      "classification-lookup",
      "token-resolution",
      "sense-selection",
      // Time programme T1 (2026-11-20): Timekeeping's two
      // operations register as holdings — the seat is not a
      // holding until the registry says so (design note §6).
      "clock-consultation",
      "staleness-query",
      // Time programme T2 (2026-11-20): Scheduling's two
      // operations register as holdings, on T1's pattern.
      "schedule-registration",
      "schedule-sweep",
      // Time programme T3 (2026-11-20): Expectation's two
      // operations register as holdings, on the same pattern.
      "expectation-registration",
      "expectation-sweep",
      // Time programme C1 (2026-11-20): Calendar's two
      // operations register as holdings, on the same pattern.
      "calendar-conversion",
      "calendar-grid-arithmetic",
      // Time programme C2 (2026-11-20): the lunisolar's
      // machinery and the solar terms register alongside.
      "calendar-lunisolar-conversion",
      "calendar-solar-terms",
      // Time programme C3 (2026-11-20): Timeline's two
      // holdings and Scheduling's placement register.
      "timeline-relations",
      "timeline-duration-read-off",
      "schedule-placement",
      "wikidata-lookup",
    ],
  );
  for (const entry of CAPABILITY_REGISTRY) {
    assert.ok(entry.takes.length > 0 && entry.returns.length > 0, `${entry.id}: takes/returns stated`);
    assert.ok(entry.code.functions.length > 0, `${entry.id}: names its code`);
    assert.equal(capabilityById(entry.id), entry);
  }
  assert.deepEqual(allCapabilities(), CAPABILITY_REGISTRY);
  assert.equal(capabilityById("ordering-and-sorting"), undefined, "a Functions family is not a holding");
});

test("every registered code pointer names a module that exists and a function it contains", () => {
  for (const entry of CAPABILITY_REGISTRY) {
    const file = path.join(ROOT, entry.code.module);
    assert.ok(fs.existsSync(file), `${entry.id}: module ${entry.code.module} exists`);
    const source = fs.readFileSync(file, "utf8");
    for (const fn of entry.code.functions) {
      const leaf = fn.split(".").pop()!;
      assert.ok(
        source.includes(`${leaf}(`) || source.includes(`${leaf} (`),
        `${entry.id}: ${entry.code.module} contains ${fn}`,
      );
    }
  }
});

test("every holder named in the registry is a unit that stands on the map", () => {
  const map = fs.readFileSync(path.join(ROOT, "ai-system/system-map.ts"), "utf8");
  for (const entry of CAPABILITY_REGISTRY) {
    assert.ok(map.includes(`"id": "${entry.heldBy}"`), `${entry.id}: holder ${entry.heldBy} is a map node`);
  }
  for (const seat of UNBUILT_CAPABILITY_SEATS) {
    assert.ok(map.includes(`"id": "${seat.seat}"`), `seat ${seat.seat} is a map node`);
  }
});

test("no placeholder seat is registered as a holding", () => {
  // Supersession (Time programme T1, 2026-11-20): the blanket
  // form of this rule — no entry held by any functions/* seat —
  // stood while every Functions family was a placeholder. T1
  // built Timekeeping, so its seat is a holding's home, not a
  // placeholder: an entry may now be held by a BUILT Functions
  // family, enumerated here as data. The rule's substance is
  // unchanged: a placeholder seat is never registered as a
  // holding (time design note §6: a seat is not a holding
  // until the registry says so — and the registry may say so
  // only once the seat is built).
  const BUILT_FUNCTIONS_FAMILIES = ["functions/timekeeping", "functions/scheduling", "functions/expectation", "functions/calendar", "functions/timeline"];
  for (const entry of CAPABILITY_REGISTRY) {
    if (entry.heldBy.startsWith("functions/")) {
      assert.ok(
        BUILT_FUNCTIONS_FAMILIES.includes(entry.heldBy),
        `${entry.id}: held by ${entry.heldBy}, a Functions placeholder seat`,
      );
    }
    assert.equal(unbuiltSeatFor(entry.id), undefined, `${entry.id}: not also listed as unbuilt`);
  }
  // The unbuilt seats are the Functions families plus Geometry —
  // named so a lack can be located, never registered.
  assert.deepEqual(
    UNBUILT_CAPABILITY_SEATS.map((s) => s.requirement),
    ["ordering-and-sorting", "search", "editing", "external-query", "file-system", "geometry"],
  );
});

test("the audit: a held requirement — verdict, entry, and the registry check on the list", () => {
  const audit = auditCapability("quantity-ledger");
  assert.equal(audit.verdict, "held");
  assert.equal(audit.entry?.id, "quantity-ledger");
  assert.equal(audit.entry?.heldBy, "ontology-core/ontology-knowledge-unit/mathematics/quantification-unit");
  assert.equal(audit.checked.length, 1, "a held verdict rests on the one check that found it");
  assert.equal(audit.checked[0].against, "capability registry");
  assert.match(audit.checked[0].detail, /quantity-ledger/);
});

test("the audit: a seat that stands unbuilt — the lack is located at the seat", () => {
  const audit = auditCapability("search");
  assert.equal(audit.verdict, "seat-exists-unbuilt");
  assert.equal(audit.seat?.seat, "functions/search");
  assert.equal(audit.entry, undefined);
  assert.deepEqual(audit.checked.map((c) => c.against), ["capability registry", "unbuilt seats"]);
  assert.match(audit.checked[0].detail, /no entry under 'search'/);
  assert.match(audit.checked[1].detail, /functions\/search/);
});

test("the audit: no seat anywhere — an unlocated lack, with both checks on the record", () => {
  const audit = auditCapability("teleportation");
  assert.equal(audit.verdict, "no-seat");
  assert.equal(audit.entry, undefined);
  assert.equal(audit.seat, undefined);
  assert.deepEqual(audit.checked.map((c) => c.against), ["capability registry", "unbuilt seats"]);
});

test("the capability need kind: registered, distinct from lack-of-information, and a record under it names its operation", () => {
  assert.deepEqual(
    NEED_KINDS.map((n) => n.id),
    ["quantification", "lack-of-information", "how-to-proceed", "capability"],
  );
  assert.equal(needKind("capability")?.standing, "registered");
  const s = newSession();
  const p = openProblem(s, {
    seat: "internal",
    bearer: "system",
    subject: "the candidates must be ordered before the walk can proceed",
    need: "capability",
    capability: "ordering-and-sorting",
    ground: "assessed",
    turn: 1,
    reason: "a step of the walk requires an ordering operation",
  });
  assert.equal(p.need, "capability");
  assert.equal(p.capability, "ordering-and-sorting");
  assert.equal(p.status, "open", "a capability problem stands open — the audit, not the turn's end, settles it");
  // And the audit of the named requirement locates the lack.
  assert.equal(auditCapability(p.capability!).verdict, "seat-exists-unbuilt");
});
