// Research instrument: each variant runs in a fresh process so global lexicon
// state is identical. The production source and compiled files are untouched.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const cases = JSON.parse(fs.readFileSync(process.env.ANSCI_ABLATION_CASES || path.join(root, 'data/ansci/wuxing-ablation-v1.json')));
const modes = ['off', 'full', 'same', 'lesk', 'cycle_no_lesk', 'same_no_lesk'];
if (!process.argv[2]) {
  for (const mode of modes) {
    const p = spawnSync(process.execPath, [__filename, mode], {encoding:'utf8', cwd:root});
    if (p.status !== 0) { process.stderr.write(p.stderr); process.exit(1); }
    process.stdout.write(p.stdout);
  }
  process.exit(0);
}
const mode = process.argv[2];
if (!modes.includes(mode)) throw Error('Unknown mode');
const sensePath = require.resolve('../dist/src/ansci/sense.js');
let source = fs.readFileSync(sensePath, 'utf8');
if (mode === 'same' || mode === 'same_no_lesk' || mode === 'lesk') {
  const start = source.indexOf('function relationSupport(');
  const end = source.indexOf('/** The baseline element picture', start);
  if (start < 0 || end < 0) throw Error('Cannot locate relationSupport');
  source = source.slice(0,start) + (mode === 'lesk'
    ? 'function relationSupport() { return 0; }\n'
    : 'function relationSupport(a,b) { return a === b ? 1 : 0; }\n') + source.slice(end);
}
if (mode.endsWith('_no_lesk')) {
  const before = source;
  source = source.replace('if (tied.length >= 2) {', 'if (false) {');
  if (source === before) throw Error('Cannot locate Lesk gate');
}
const instance = new Module(sensePath, module);
instance.filename = sensePath;
instance.paths = Module._nodeModulePaths(path.dirname(sensePath));
require.cache[sensePath] = instance;
instance._compile(source, sensePath);
if (mode === 'off') instance.exports.applySenseSelection = () => [];
const { parse } = require('../dist/src/ansci/parse.js');
const { newSession } = require('../dist/src/ansci/session.js');
const { processTurn } = require('../dist/src/ansci/turn.js');
const { enableWordnetLexicon } = require('../dist/src/ansci/wordnet-lex.js');
enableWordnetLexicon(true);
for (const item of cases) {
  try {
    const p = parse(item.text, 'en');
    const nodes = p.meaning.nodes;
    const edges = p.meaning.edges.map(e => [nodes.find(n=>n.id===e.from)?.lemma,e.relation,nodes.find(n=>n.id===e.to)?.lemma]);
    const hits = item.roles.map(role => edges.some(e => JSON.stringify(e) === JSON.stringify(role)));
    const target = nodes.find(n=>n.lemma===item.target);
    const turn = processTurn(newSession(), item.text);
    console.log(JSON.stringify({mode,text:item.text,reading:item.reading,target:item.target,element:target?.semanticElement ?? null,roles:item.roles,hits,edges,reply:turn.reply,cyclePath:turn.trace.cyclePath ?? null,steeringNote:turn.trace.steeringNote ?? null}));
  } catch(e) { console.log(JSON.stringify({mode,text:item.text,error:e.message})); }
}
