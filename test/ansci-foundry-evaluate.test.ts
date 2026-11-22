import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateTurn,
  verdictOf,
  type EvalGraph,
} from "../src/ansci/foundry-evaluate";

const biteActive: EvalGraph = {
  nodes: [
    {
      id: "n1",
      lemma: "bite",
      states: {
        voice: "active",
        tense: "past",
        mood: "indicative",
        negated: false,
        subjectPerson: "3sg",
      },
    },
    { id: "n2", lemma: "dog", role: "agent" },
    { id: "n3", lemma: "man", role: "patient" },
  ],
  edges: [
    { from: "n1", to: "n2", relation: "agent" },
    { from: "n1", to: "n3", relation: "patient" },
  ],
  rootId: "n1",
};

test("active roles, tense and negative controls pass", () => {
  const checks = evaluateTurn(biteActive, { resolutions: [] }, "Ok. Noted.", {
    root: "bite",
    roles: [
      { predicate: "bite", participant: "dog", role: "agent" },
      { predicate: "bite", participant: "man", role: "patient" },
    ],
    forbiddenRoles: [
      { predicate: "bite", participant: "man", role: "agent" },
      { predicate: "bite", participant: "dog", role: "patient" },
    ],
    tense: "past",
    mood: "indicative",
    voice: "active",
    negated: false,
  });
  assert.equal(verdictOf(checks), "pass");
  assert.ok(checks.every((check) => check.outcome === "pass"), JSON.stringify(checks));
});

test("swapped participants fail the role and trip the forbidden control", () => {
  const checks = evaluateTurn(biteActive, { resolutions: [] }, "Ok. Noted.", {
    root: "bite",
    roles: [{ predicate: "bite", participant: "man", role: "agent" }],
    forbiddenRoles: [{ predicate: "bite", participant: "dog", role: "agent" }],
  });
  assert.equal(verdictOf(checks), "fail");
  assert.equal(checks.find((check) => check.id === "role-0")?.outcome, "fail");
  assert.equal(checks.find((check) => check.id === "forbidden-0")?.outcome, "fail");
});

test("passive tense mismatch fails while roles pass", () => {
  const passive: EvalGraph = {
    nodes: [
      {
        id: "n1",
        lemma: "bite",
        states: { voice: "passive", tense: "present", aux: "was", mood: "indicative" },
      },
      { id: "n2", lemma: "man", role: "patient" },
      { id: "n3", lemma: "dog", role: "agent" },
    ],
    edges: [
      { from: "n1", to: "n2", relation: "patient" },
      { from: "n1", to: "n3", relation: "agent" },
    ],
    rootId: "n1",
  };
  const checks = evaluateTurn(passive, { resolutions: [] }, "Ok. Noted.", {
    root: "bite",
    roles: [
      { predicate: "bite", participant: "dog", role: "agent" },
      { predicate: "bite", participant: "man", role: "patient" },
    ],
    voice: "passive",
    tense: "past",
  });
  assert.equal(checks.find((check) => check.id === "tense")?.outcome, "fail");
  assert.equal(checks.find((check) => check.id === "role-0")?.outcome, "pass");
  assert.equal(verdictOf(checks), "fail");
});

test("missing graph is not-observable, not a silent pass", () => {
  const checks = evaluateTurn(null, null, "…", { root: "bite" });
  assert.equal(checks.length, 1);
  assert.equal(checks[0].outcome, "not-observable");
  assert.equal(verdictOf(checks), "not-observable");
});

test("resolution, qualifier and question target match trace and edges", () => {
  const graph: EvalGraph = {
    nodes: [
      { id: "n1", lemma: "ball", role: "subject" },
      { id: "n2", lemma: "york", role: "location" },
      { id: "n3", lemma: "new" },
    ],
    edges: [
      { from: "n1", to: "n2", relation: "location" },
      { from: "n3", to: "n2", relation: "qualifies" },
    ],
    rootId: "n2",
  };
  const checks = evaluateTurn(
    graph,
    { resolutions: [{ pronoun: "it", resolvedTo: "ball" }] },
    "Ok.",
    {
      roles: [{ predicate: "ball", participant: "york", role: "location" }],
      qualifier: [{ head: "york", modifier: "new", relation: "qualifies" }],
      resolution: { pronoun: "it", target: "ball", evidence: "trace.resolutions" },
    },
  );
  assert.equal(verdictOf(checks), "pass");

  const wh: EvalGraph = {
    nodes: [
      { id: "n1", lemma: "bite", states: { mood: "interrogative", tense: "past" } },
      { id: "n2", lemma: "who", role: "agent" },
      { id: "n3", lemma: "man", role: "patient" },
    ],
    edges: [
      { from: "n1", to: "n2", relation: "agent" },
      { from: "n1", to: "n3", relation: "patient" },
    ],
    rootId: "n1",
  };
  const whChecks = evaluateTurn(wh, { resolutions: [] }, "I can't answer that.", {
    root: "bite",
    questionTarget: { predicate: "bite", role: "agent" },
    reply: { abstentionPermitted: true, constraints: ["no-agent-identity"] },
  });
  assert.equal(whChecks.find((check) => check.id === "question-target")?.outcome, "pass");
  assert.equal(whChecks.find((check) => check.id === "reply")?.outcome, "abstained");
  assert.equal(verdictOf(whChecks), "pass");
});

test("negation carrier and attached-but-ungraded roles", () => {
  const graph: EvalGraph = {
    nodes: [
      {
        id: "n1",
        lemma: "chase",
        states: {
          tense: "past",
          mood: "indicative",
          voice: "active",
          negated: true,
          negation: { negator: "not", carrier: "did" },
        },
      },
      { id: "n2", lemma: "cat", role: "agent" },
      { id: "n3", lemma: "mouse", role: "theme" },
    ],
    edges: [
      { from: "n1", to: "n2", relation: "agent" },
      { from: "n1", to: "n3", relation: "theme" },
    ],
    rootId: "n1",
  };
  const checks = evaluateTurn(graph, { resolutions: [] }, "Ok. Noted.", {
    root: "chase",
    roles: [{ predicate: "chase", participant: "cat", role: "agent" }],
    attached: [{ predicate: "chase", participant: "mouse" }],
    roleOpen: [{ predicate: "chase", participant: "mouse" }],
    negated: true,
    negationCarrier: "did",
  });
  assert.equal(verdictOf(checks), "pass");
});
