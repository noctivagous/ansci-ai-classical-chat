#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newSession } from '../dist/src/ansci/session.js';
import { processTurn } from '../dist/src/ansci/turn.js';
import { evaluateTurn, verdictOf } from '../dist/src/ansci/foundry-evaluate.js';
import { compareReports } from '../dist/src/ansci/foundry-compare.js';
import { clockFromConfig } from '../dist/src/ansci/foundry-clock.js';
import { wordnetAvailable } from '../dist/src/ansci/wordnet-lex.js';
import { frameNetAvailable } from '../dist/src/ansci/framenet-lex.js';
import { getDefaultExtract } from '../dist/src/wordnet.js';
import { getDefaultFrameNetBundle } from '../dist/src/framenet.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const fail = (message) => { console.error(`Foundry: ${message}`); process.exit(2); };
const args = process.argv.slice(2);
const usage = 'usage: npm run foundry -- (run --input <file> | evaluate --suite <file>) --json | compare --before <file> --after <file> --json';
const command = args[0];
if (!['run', 'evaluate', 'compare'].includes(command)) fail(usage);
if (command === 'compare') {
  if (args.length !== 6 || args[1] !== '--before' || args[3] !== '--after' || args[5] !== '--json') fail(usage);
} else {
  if (args.length !== 4 || args[3] !== '--json') fail(usage);
  if (args[0] === 'run' && args[1] !== '--input') fail(usage);
  if (args[0] === 'evaluate' && args[1] !== '--suite') fail(usage);
}
const readJson = (path, label) => {
  try { const bytes = readFileSync(resolve(path)); return { bytes, json: JSON.parse(bytes.toString('utf8')) }; }
  catch (error) { fail(`cannot read ${label}: ${error.message}`); return null; }
};
let bytes, input;
if (command !== 'compare') {
  ({ bytes, json: input } = readJson(args[2], 'input'));
}
if (input && (input?.schemaVersion !== 1 || input.configuration?.profile !== 'chat' || input.configuration?.resources !== 'required' || !Array.isArray(input.cases) || !input.cases.length)) fail('expected schemaVersion 1, chat profile, required resources and nonempty cases');
const caseIds = new Set();
for (const c of input?.cases ?? []) {
  if (typeof c.id !== 'string' || !c.id || caseIds.has(c.id) || !Array.isArray(c.turns) || !c.turns.length) fail('cases require unique nonempty IDs and turns');
  caseIds.add(c.id);
  if (command === 'evaluate' && c.status !== 'must-pass' && c.status !== 'known-failure') fail(`case ${c.id}: evaluate requires status must-pass or known-failure`);
  const ids = new Set();
  for (const t of c.turns) {
    if (typeof t.id !== 'string' || !t.id || ids.has(t.id) || typeof t.input !== 'string' || !t.input.trim()) fail(`case ${c.id}: turns require unique IDs and nonempty input`);
    if (command === 'run' && 'expect' in t) fail('run does not evaluate expectations; use evaluate');
    if (command === 'evaluate' && (typeof t.expect !== 'object' || t.expect === null)) fail(`case ${c.id} turn ${t.id}: evaluate requires an expect block`);
    ids.add(t.id);
  }
}
function verifyParts(relative, kinds) {
  const directory = join(root, 'data', relative);
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  if (!manifest.edition || !manifest.source || !Array.isArray(manifest.parts) || !manifest.parts.length) throw Error(`${relative}: invalid manifest`);
  const totals = {};
  for (const part of manifest.parts) {
    if (!kinds.includes(part.kind) || typeof part.file !== 'string' || !/^part-\d+\.json$/.test(part.file)) throw Error(`${relative}: invalid part entry`);
    const data = readFileSync(join(directory, part.file));
    const rows = JSON.parse(data.toString('utf8'));
    if (!Array.isArray(rows) || rows.length !== part.count || data.length !== part.bytes) throw Error(`${relative}/${part.file}: size or record count mismatch`);
    totals[part.kind] = (totals[part.kind] ?? 0) + rows.length;
  }
  for (const kind of kinds) if (!totals[kind]) throw Error(`${relative}: missing ${kind}`);
  for (const kind of kinds) {
    const countKey = relative === 'framenet' && kind === 'relations' ? 'frameRelations' : kind;
    if (manifest.counts?.[countKey] !== totals[kind]) throw Error(`${relative}: ${kind} total does not match manifest`);
  }
  return { edition: manifest.edition, source: manifest.source, totals };
}
let resources;
if (command === 'compare') {
  const before = readJson(args[2], 'before report');
  const after = readJson(args[4], 'after report');
  for (const [report, label] of [[before.json, 'before'], [after.json, 'after']]) {
    if (report?.schemaVersion !== 1 || !Array.isArray(report?.cases)) fail(`${label} report must be a schemaVersion 1 evaluate report with cases`);
  }
  const comparison = compareReports(before.json, after.json);
  const output = {
    schemaVersion: 1,
    compareId: randomUUID(),
    timestamp: new Date().toISOString(),
    before: { file: args[2], sha256: createHash('sha256').update(before.bytes).digest('hex'), source: before.json.source ?? null, fixture: before.json.fixture ?? null, configuration: before.json.configuration ?? null },
    after: { file: args[4], sha256: createHash('sha256').update(after.bytes).digest('hex'), source: after.json.source ?? null, fixture: after.json.fixture ?? null, configuration: after.json.configuration ?? null },
    ...comparison,
  };
  console.log(JSON.stringify(output, null, 2));
  if (comparison.summary.comparable === 0) fail('no comparable cases: check that both reports grade the same suite');
  if (comparison.summary.regressions > 0 || comparison.summary.unexpectedPasses > 0) process.exit(1);
  process.exit(0);
}
try {
  const wn = verifyParts('wordnet/extract', ['synsets', 'relations', 'forms']);
  const fn = verifyParts('framenet', ['frames', 'relations']);
  if (!wordnetAvailable() || !frameNetAvailable()) throw Error('lexical providers unavailable');
  const extract = getDefaultExtract(), bundle = getDefaultFrameNetBundle();
  if (extract.synsets.length !== wn.totals.synsets || bundle.frames.length !== fn.totals.frames || bundle.relations.length !== fn.totals.relations) throw Error('loaded resource counts do not match files');
  resources = { wordnet: { ...wn, ready: true }, framenet: { ...fn, ready: true } };
} catch (error) { fail(`required resources unavailable: ${error.message}`); }
function git(...args) { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } }
const revision = git('rev-parse', 'HEAD');
const status = git('status', '--porcelain');
let foundryClock = null;
if (command !== 'compare') {
  try { foundryClock = clockFromConfig(input.configuration ?? {}); }
  catch (error) { fail(`invalid clock configuration: ${error.message}`); }
}
const newFoundrySession = () => foundryClock
  ? newSession(undefined, undefined, { clockSource: foundryClock.source, clockRetrievedFrom: foundryClock.retrievedFrom })
  : newSession();
const report = { schemaVersion: 1, runId: randomUUID(), timestamp: new Date().toISOString(), source: { revision, dirty: status === null ? null : status.length > 0 }, fixture: { path: args[2], sha256: createHash('sha256').update(bytes).digest('hex') }, configuration: { profile: 'chat', entry: 'newSession + processTurn', clock: foundryClock ? foundryClock.description : 'default session behavior; not pinned', persistence: 'in-memory session; no interlocutor store', browserParity: 'not verified', resources }, cases: [] };
function takeTurn(session, text) {
  const previousIds = new Set(session.objects.map((o) => o.id));
  const output = processTurn(session, text);
  const objects = session.objects.filter((o) => o.producer === 'person' && !previousIds.has(o.id));
  const object = objects.length === 1 ? objects[0] : undefined;
  const meaning = object?.content?.meaning;
  return { output, object, meaning, graphUnavailableReason: meaning ? null : objects.length > 1 ? `multiple visitor objects created (${objects.length}); inspect trace` : object ? 'visitor object has no meaning graph' : 'no visitor semantic object created for this turn' };
}
const replyProvenanceOf = (output) => output.trace.wordingNotDerived ? 'hand-worded or mixed' : output.trace.replyGraph || output.trace.replyObject ? 'reply graph or object present' : 'not established by trace';
try {
  let failedRequired = false;
  let needsReview = false;
  for (const c of input.cases) {
    const session = newFoundrySession();
    if (command === 'run') {
      const result = { id: c.id, status: c.status ?? 'unclassified', turns: [] };
      for (const turn of c.turns) {
        const { output, object, meaning, graphUnavailableReason } = takeTurn(session, turn.input);
        result.turns.push({ id: turn.id, input: turn.input, reply: output.reply, replyProvenance: replyProvenanceOf(output), mapPath: output.trace.mapPath ?? null, trace: output.trace, semanticObject: object ?? null, meaningGraph: meaning ?? null, graphUnavailableReason });
      }
      report.cases.push(result);
      continue;
    }
    const result = { id: c.id, status: c.status, turns: [], checks: { pass: 0, fail: 0, abstained: 0, notObservable: 0 } };
    for (const turn of c.turns) {
      const { output, meaning } = takeTurn(session, turn.input);
      const checks = evaluateTurn(meaning ?? null, output.trace ?? null, output.reply, turn.expect);
      for (const check of checks) {
        if (check.outcome === 'pass') result.checks.pass += 1;
        else if (check.outcome === 'fail') result.checks.fail += 1;
        else if (check.outcome === 'abstained') result.checks.abstained += 1;
        else result.checks.notObservable += 1;
      }
      result.turns.push({ id: turn.id, input: turn.input, reply: output.reply, replyProvenance: replyProvenanceOf(output), verdict: verdictOf(checks), checks });
    }
    const verdict = verdictOf(result.turns.flatMap((turn) => turn.checks));
    if (c.status === 'must-pass') {
      result.verdict = verdict === 'pass' ? 'pass' : 'fail';
      if (result.verdict === 'fail') failedRequired = true;
    } else {
      result.verdict = verdict === 'pass' ? 'unexpected-pass' : 'known-failure';
      if (result.verdict === 'unexpected-pass') needsReview = true;
    }
    report.cases.push(result);
  }
  report.summary = command === 'evaluate'
    ? { cases: report.cases.length, failedRequired, needsReview }
    : undefined;
  console.log(JSON.stringify(report, null, 2));
  if (command === 'evaluate' && (failedRequired || needsReview)) process.exit(1);
} catch (error) { fail(`execution failed: ${error.stack ?? error}`); }
