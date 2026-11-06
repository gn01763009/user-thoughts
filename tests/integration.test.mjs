import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const MERGE = fileURLToPath(new URL('../skills/persona-walkthrough/scripts/merge-findings.mjs', import.meta.url));
const SCORE = fileURLToPath(new URL('../evals/score.mjs', import.meta.url));
const TRUTH = fileURLToPath(new URL('../evals/ground-truth/planted.json', import.meta.url));
const tempDirs = [];

after(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

const jsonl = (items) => items.map((item) => `${JSON.stringify(item)}\n`).join('');

const trace = (step) => ({
  step, route: '/', action: 'looked', expected: 'x', saw: 'y', screenshot: `screens/0${step}.png`,
  cw: { would_try: true, would_notice: true, would_understand: true, got_feedback: true },
  progress: true, leave_urge: 1,
});

const FINDING = {
  persona: 'novice',
  category: 'comprehension',
  route: '/solutions.html',
  element: { role: 'heading', name: 'Receivables orchestration' },
  observed: 'I looked for invoices. The page said Receivables orchestration, which is jargon to me.',
  quote: 'Receivables orchestration',
  screenshot: 'screens/03.png',
  step: 3,
  impact: 'slowed_me',
  interpretation: 'Invoices are given a corporate name.',
  confidence: 8,
};

function buildRun() {
  const runDir = mkdtempSync(join(tmpdir(), 'integration-'));
  tempDirs.push(runDir);
  writeFileSync(join(runDir, 'run.json'), JSON.stringify({
    url: 'http://localhost:4173/', date: '2026-11-06T18:30:00+08:00', personas: ['novice'], browser_mode: 'parallel',
  }));
  const dir = join(runDir, 'novice');
  mkdirSync(join(dir, 'screens'), { recursive: true });
  writeFileSync(join(dir, 'screens', '03.png'), 'png');
  writeFileSync(join(dir, 'trace.jsonl'), jsonl([trace(1), trace(2), trace(3)]));
  writeFileSync(join(dir, 'findings.jsonl'), jsonl([FINDING]));
  writeFileSync(join(dir, 'features.jsonl'), '');
  writeFileSync(join(dir, 'summary.json'), JSON.stringify({
    persona: 'novice', status: 'DONE', outcome: 'abandoned', stop_reason: 'no_progress_limit',
    left_at: '/solutions.html', steps: 3, first_impression: {},
  }));
  return runDir;
}

const node = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

test('merge output feeds the scorer: a planted problem is matched', () => {
  const runDir = buildRun();
  const merged = node(MERGE, [runDir]);
  assert.equal(merged.status, 0, merged.stderr);
  const mergedPath = join(runDir, 'merged.json');
  assert.equal(JSON.parse(readFileSync(mergedPath, 'utf8')).findings[0].sources[0].observed, FINDING.observed);

  const scored = node(SCORE, ['--mode', 'planted', '--input', mergedPath, '--truth', TRUTH, '--json']);
  const result = JSON.parse(scored.stdout);
  assert.ok(result.matched.some((m) => m.id === 'U3'), `U3 not matched: ${scored.stdout}`);
});
