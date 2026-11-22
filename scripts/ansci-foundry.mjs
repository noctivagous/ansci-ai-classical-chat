#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newSession } from '../dist/src/ansci/session.js';
import { processTurn } from '../dist/src/ansci/turn.js';
import { wordnetAvailable } from '../dist/src/ansci/wordnet-lex.js';
import { frameNetAvailable } from '../dist/src/ansci/framenet-lex.js';
import { getDefaultExtract } from '../dist/src/wordnet.js';
import { getDefaultFrameNetBundle } from '../dist/src/framenet.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const fail = (message) => { console.error(`Foundry: ${message}`); process.exit(2); };
const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== 'run' || args[1] !== '--input' || args[3] !== '--json') fail('usage: npm run foundry -- run --input <file> --json');
let bytes, input;
try { bytes = readFileSync(resolve(args[2])); input = JSON.parse(bytes.toString('utf8')); }
catch (error) { fail(`cannot read input: ${error.message}`); }
if (input?.schemaVersion !== 1 || input.configuration?.profile !== 'chat' || input.configuration?.resources !== 'required' || !Array.isArray(input.cases) || !input.cases.length) fail('expected schemaVersion 1, chat profile, required resources and nonempty cases');
const caseIds = new Set();
for (const c of input.cases) {
  if (typeof c.id !== 'string' || !c.id || caseIds.has(c.id) || !Array.isArray(c.turns) || !c.turns.length) fail('cases require unique nonempty IDs and turns');
  caseIds.add(c.id);
  const ids = new Set();
  for (const t of c.turns) {
    if (typeof t.id !== 'string' || !t.id || ids.has(t.id) || typeof t.input !== 'string' || !t.input.trim()) fail(`case ${c.id}: turns require unique IDs and nonempty input`);
    if ('expect' in t) fail('run does not evaluate expectations; evaluation is not implemented');
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
const report = { schemaVersion: 1, runId: randomUUID(), timestamp: new Date().toISOString(), source: { revision, dirty: status === null ? null : status.length > 0 }, fixture: { path: args[2], sha256: createHash('sha256').update(bytes).digest('hex') }, configuration: { profile: 'chat', entry: 'newSession + processTurn', clock: 'default session behavior; not pinned', persistence: 'in-memory session; no interlocutor store', browserParity: 'not verified', resources }, cases: [] };
try {
  for (const c of input.cases) {
    const session = newSession();
    const result = { id: c.id, status: c.status ?? 'unclassified', turns: [] };
    for (const turn of c.turns) {
      const previousIds = new Set(session.objects.map((o) => o.id));
      const output = processTurn(session, turn.input);
      const objects = session.objects.filter((o) => o.producer === 'person' && !previousIds.has(o.id));
      const object = objects.length === 1 ? objects[0] : undefined;
      const meaning = object?.content?.meaning;
      result.turns.push({ id: turn.id, input: turn.input, reply: output.reply, replyProvenance: output.trace.wordingNotDerived ? 'hand-worded or mixed' : output.trace.replyGraph || output.trace.replyObject ? 'reply graph or object present' : 'not established by trace', mapPath: output.trace.mapPath ?? null, trace: output.trace, semanticObject: object ?? null, meaningGraph: meaning ?? null, graphUnavailableReason: meaning ? null : objects.length > 1 ? `multiple visitor objects created (${objects.length}); inspect trace` : object ? 'visitor object has no meaning graph' : 'no visitor semantic object created for this turn' });
    }
    report.cases.push(result);
  }
  console.log(JSON.stringify(report, null, 2));
} catch (error) { fail(`execution failed: ${error.stack ?? error}`); }
