// Cross-boundary tests: real merge-findings.mjs output feeds real build-report.mjs. No hand-written merged data.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { labelsFor } from '../skills/launch/scripts/labels.mjs';

const MERGE = fileURLToPath(new URL('../skills/launch/scripts/merge-findings.mjs', import.meta.url));
const BUILD = fileURLToPath(new URL('../skills/launch/scripts/build-report.mjs', import.meta.url));
const tempDirs = [];
after(() => { for (const d of tempDirs) rmSync(d, { recursive: true, force: true }); });

const ID = 'p1-novice';
const CARD = { id: ID, base: 'novice', name: 'Mina', situation: 'on a bus with a phone', why_chosen: 'w', arrival: 'a', apple_pitch: 'p' };
const jsonl = (items) => items.map((item) => `${JSON.stringify(item)}\n`).join('');
const node = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

const traceLine = (step, thought) => ({
  step, route: '/', action: 'clicked', expected: 'x', saw: 'y', screenshot: `screens/0${step}.png`,
  cw: { would_try: true, would_notice: true, would_understand: true, got_feedback: true },
  thought, feeling: 'unsure', progress: true, leave_urge: 1,
});

const baseSummary = {
  persona: ID, status: 'DONE', outcome: 'abandoned', stop_reason: 'no_progress_limit', left_at: '/signup.html', steps: 2,
  first_impression: {}, came_for: 'send an invoice',
};

const FINDING = {
  persona: ID, category: 'friction', route: '/signup.html', element: { role: 'button', name: 'Continue' },
  observed: 'I clicked Continue expecting the next step. Nothing happened.', quote: 'Continue', screenshot: 'screens/02.png',
  step: 2, impact: 'stopped_me', interpretation: 'The button is broken.', confidence: 8,
};

function writePerson(runDir, { summary = baseSummary, findings = [FINDING] } = {}) {
  const dir = join(runDir, ID);
  mkdirSync(join(dir, 'screens'), { recursive: true });
  for (const n of [1, 2]) writeFileSync(join(dir, 'screens', `0${n}.png`), 'png');
  writeFileSync(join(dir, 'trace.jsonl'), jsonl([traceLine(1, 'Where do I start?'), traceLine(2, 'Nothing happened when I clicked.')]));
  writeFileSync(join(dir, 'findings.jsonl'), jsonl(findings));
  writeFileSync(join(dir, 'features.jsonl'), '');
  writeFileSync(join(dir, 'summary.json'), JSON.stringify(summary));
}

function makeRun(root, name, { depth = 'standard', language = 'en', extra = {}, ...person } = {}) {
  const runDir = join(root, name);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'run.json'), JSON.stringify({
    url: 'http://localhost:4173/', date: '2026-11-08T14:30:00Z', depth, language, vision: 'send fast', understanding: 'invoicing',
    personas: [ID], people: [CARD], browser_mode: 'parallel', ...extra,
  }));
  writePerson(runDir, person);
  return runDir;
}

function mergeAndBuild(runDir) {
  const merged = node(MERGE, [runDir]);
  assert.equal(merged.status, 0, merged.stderr);
  const built = node(BUILD, [runDir]);
  assert.equal(built.status, 0, built.stderr);
  return { merged: JSON.parse(readFileSync(join(runDir, 'merged.json'), 'utf8')), html: readFileSync(join(runDir, 'report.html'), 'utf8') };
}

const tempRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'merge-to-report-'));
  tempDirs.push(root);
  return root;
};
const between = (html, start, end) => html.slice(html.indexOf(`id="section-${start}"`), end ? html.indexOf(`id="section-${end}"`) : undefined);

test('full depth: a launch comment cites its own step and a bystander comment comes from the chain', () => {
  const summary = {
    ...baseSummary,
    last_words: { would_return: 'no', why: 'it broke', tell_a_friend: 'An invoicing site whose button is broken.', steps: [2] },
    apple: { answer: 'no', why: 'I came to send one invoice' },
    launch_comment: { text: 'Pretty site, but the Continue button did nothing.', steps: [2] },
  };
  const runDir = makeRun(tempRoot(), 'full', { depth: 'full', summary });
  writeFileSync(join(runDir, 'telephone.json'), JSON.stringify({
    chains: [{ from: ID, hops: ['Someone said it has a broken button.', 'Probably an invoicing tool for freelancers.'], comment: 'Sounds half finished.' }],
  }));
  const { merged, html } = mergeAndBuild(runDir);
  const labels = labelsFor('en');
  assert.equal(merged.people[0].launch_comment.text, summary.launch_comment.text);
  const comments = html.slice(html.indexOf('id="section-comments"'));
  assert.ok(comments.includes('Pretty site, but the Continue button did nothing.'));
  assert.ok(comments.includes('Nothing happened when I clicked.'), 'the comment shows the thought of the step it cites');
  assert.ok(comments.includes(labels.bystander));
  assert.ok(comments.includes('Sounds half finished.'));
  const telephone = between(html, 'telephone', 'comments');
  assert.ok(telephone.includes('Probably an invoicing tool for freelancers.'));
});

test('--rerun: both timelines appear with where and why each visit stopped', () => {
  const root = tempRoot();
  const firstSummary = { ...baseSummary, stop_reason: 'leave_urge', left_at: '/pricing.html', steps: 2 };
  makeRun(root, 'first', { summary: firstSummary });
  mergeAndBuild(join(root, 'first'));
  const secondSummary = { ...baseSummary, outcome: 'completed', stop_reason: 'goal_reached', left_at: '/done.html', steps: 2 };
  const { html } = mergeAndBuild(makeRun(root, 'second', { summary: secondSummary, extra: { rerun_of: 'first' } }));
  const labels = labelsFor('en');
  const rerun = between(html, 'rerun', 'overview');
  assert.ok(!rerun.includes(labels.previous_missing));
  for (const text of ['/pricing.html', labels.stop_reason_leave_urge, '/done.html', labels.stop_reason_goal_reached]) {
    assert.ok(rerun.includes(text), text);
  }
});

test('a run with no verification.jsonl keeps findings unverified and shows why under not checked', () => {
  const runDir = makeRun(tempRoot(), 'noverify');
  writeFileSync(join(runDir, 'judgements.json'), JSON.stringify({ not_checked: ['Verification did not run: the verifier was refused.'] }));
  const { merged, html } = mergeAndBuild(runDir);
  assert.equal(merged.findings[0].verification, null);
  const notChecked = between(html, 'not-checked');
  assert.ok(notChecked.includes('Verification did not run: the verifier was refused.'));
  assert.ok(!notChecked.includes('could not be reproduced'));
});

test('a real verification file marking a finding not reproduced reaches not checked', () => {
  const runDir = makeRun(tempRoot(), 'verified');
  const firstMerge = node(MERGE, [runDir]);
  assert.equal(firstMerge.status, 0, firstMerge.stderr);
  const [{ fingerprint }] = JSON.parse(readFileSync(join(runDir, 'merged.json'), 'utf8')).findings;
  writeFileSync(join(runDir, 'verification.jsonl'), jsonl([{ fingerprint, status: 'not_reproduced', note: 'gone' }]));
  const { html } = mergeAndBuild(runDir);
  assert.ok(between(html, 'not-checked').includes('Not seen when this page was re-checked. It may only appear after a click: /signup.html Continue'));
});

test('merge and build still run when reached through a symlink', () => {
  const root = tempRoot();
  for (const [script, name] of [[MERGE, 'merge-link.mjs'], [BUILD, 'build-link.mjs']]) {
    const link = join(root, name);
    symlinkSync(script, link);
    const result = node(link, []);
    assert.equal(result.status, 1, `${name}: ${result.stderr}`);
    assert.match(result.stderr, /Usage/);
  }
});
