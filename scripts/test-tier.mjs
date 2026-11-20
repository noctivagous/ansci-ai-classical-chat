// test-tier.mjs — run one tier of the test hierarchy (see TEST-TIERS.md
// and test/tiers.json). Usage: node scripts/test-tier.mjs <t0|core|t1|t2|bank|t3|units|t4|programmes>
// Assumes `npm run build` has already run (the package.json test:t* scripts do it).
// Exits with the test runner's exit code; an unknown tier or a missing
// compiled test file is an error, never a silent pass.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tiers = JSON.parse(readFileSync(join(root, 'test', 'tiers.json'), 'utf8'));

const aliases = {
  t0: ['t0'],
  t1: ['t1'],
  core: ['t0', 't1'],
  t2: ['t2'],
  bank: ['t2'],
  t3: ['t3'],
  units: ['t3'],
  t4: ['t4'],
  programmes: ['t4'],
};

const arg = (process.argv[2] || '').toLowerCase();
const wanted = aliases[arg];
if (!wanted) {
  console.error(`test-tier: unknown tier "${arg}". Use one of: ${Object.keys(aliases).join(', ')}`);
  process.exit(2);
}

const files = wanted.flatMap((t) => tiers[t]).map((name) => {
  const js = name.replace(/\.ts$/, '.js');
  return join('dist', 'test', js);
});
const missing = files.filter((f) => !existsSync(join(root, f)));
if (missing.length) {
  console.error(`test-tier: compiled test files missing (run npm run build first):\n  ${missing.join('\n  ')}`);
  process.exit(2);
}

console.log(`test-tier: ${arg} = ${wanted.join('+')} — ${files.length} files`);
const run = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
process.exit(run.status ?? 1);
