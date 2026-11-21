#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { newSession } from "../dist/src/ansci/session.js";
import { processTurn } from "../dist/src/ansci/turn.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(here, "../data/ansci/baseball-dialogue-controls-dev.json"), "utf8"));
const session = newSession();
let failed = false;

for (const turn of fixture.turns) {
  const result = processTurn(session, turn.input);
  const object = [...session.objects].reverse().find((o) => o.producer === "person" && o.surface === turn.input);
  const meaning = object?.content.meaning;
  const nodes = meaning?.nodes ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lemmas = nodes.map((n) => n.lemma.toLowerCase());
  const root = byId.get(meaning?.rootId)?.lemma.toLowerCase() ?? null;
  const edges = (meaning?.edges ?? []).map((e) => [byId.get(e.from)?.lemma.toLowerCase(), e.relation, byId.get(e.to)?.lemma.toLowerCase()]);
  const scene = object?.senses?.scene;
  const expected = turn.expected ?? {};
  const failures = [];
  if (expected.root && root !== expected.root) failures.push(`root expected ${expected.root}, got ${root}`);
  for (const lemma of expected.requiredNodes ?? []) if (!lemmas.includes(lemma)) failures.push(`missing node ${lemma}`);
  for (const [from, relation, to] of expected.requiredEdges ?? []) {
    if (!edges.some((edge) => edge[0] === from && edge[1] === relation && edge[2] === to)) failures.push(`missing edge ${from}-${relation}-${to}`);
  }
  for (const [lemma, role] of expected.forbiddenNodeRoles ?? []) {
    if (nodes.some((node) => node.lemma.toLowerCase() === lemma && node.role === role)) failures.push(`forbidden role ${lemma}:${role}`);
  }
  for (const [pronoun, antecedent] of expected.pronounResolvesTo ? [expected.pronounResolvesTo] : []) {
    if (!result.trace.resolutions.some((r) => r.pronoun.toLowerCase() === pronoun && r.resolvedTo.toLowerCase() === antecedent)) failures.push(`expected ${pronoun} to resolve to ${antecedent}`);
  }
  if (expected.forbiddenNode && lemmas.includes(expected.forbiddenNode)) failures.push(`forbidden node ${expected.forbiddenNode}`);
  if (expected.linksToPriorTurn) {
    const [mention, topic] = expected.linksToPriorTurn;
    if (!object?.links.continuesTopic || object.links.continuesTopic.topic !== topic || !lemmas.includes(mention)) failures.push(`expected ${mention} to continue topic ${topic}`);
  }
  if (expected.groundingStatus && !object?.content?.grounding?.some((g) => g.lemma.toLowerCase() === "baseball" && g.status === expected.groundingStatus)) failures.push(`baseball grounding expected ${expected.groundingStatus}`);
  if (expected.replyContains && !result.reply.toLowerCase().includes(expected.replyContains.toLowerCase())) failures.push(`reply should contain ${expected.replyContains}`);
  if (failures.length) failed = true;
  console.log(JSON.stringify({
    id: turn.id,
    input: turn.input,
    reply: result.reply,
    root,
    nodes: nodes.map((n) => ({ lemma: n.lemma.toLowerCase(), role: n.role })),
    edges,
    resolutions: result.trace.resolutions,
    grounding: object?.content?.grounding,
    controlPass: failures.length === 0,
    controlFailures: failures,
    scene: scene ? { role: scene.role, entities: scene.entities, arrangements: scene.arrangements, placed: scene.placed } : undefined,
    declineReason: result.trace.declineReason,
  }));
}
if (failed) process.exitCode = 1;
