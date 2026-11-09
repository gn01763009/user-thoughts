import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../skills/launch/scripts/build-report.mjs';
import { labelsFor } from '../skills/launch/scripts/labels.mjs';

const tempDirs = [];
after(() => { for (const d of tempDirs) rmSync(d, { recursive: true, force: true }); });

const step = (n) => ({ step: n, route: '/', action: 'a', thought: `想法${n}`, feeling: 'fine', screenshot: `p1/screens/0${n}.png`, progress: true });
const person = { id: 'p1', name: '小美', base: 'b', situation: '趕時間', why_chosen: 'w', came_for: 'c', outcome: 'completed', stop_reason: 'goal_reached', left_at: '/done', steps: [step(1)], last_words: { would_return: 'yes', why: 'ok', tell_a_friend: '不錯', steps: [1] }, apple: null, launch_comment: null };
const RUN = { url: 'https://example.com/', date: '2026-11-08', depth: 'standard', language: 'zh-TW', vision: 'v', understanding: 'u', personas: ['p1'] };
const MERGED = { personas: [{ persona: 'p1', outcome: 'completed', stop_reason: 'goal_reached', left_at: '/done', steps: 1 }], findings: [], dropped_voices: [], people: [person], apple: { asked: 1, yes: 0, no: 1, unsure: 0, warn: false } };

function runDir(files = {}, name = 'run-2') {
  const root = mkdtempSync(join(tmpdir(), 'build-report-'));
  tempDirs.push(root);
  const dir = join(root, name);
  mkdirSync(dir);
  const all = { 'run.json': RUN, 'merged.json': MERGED, ...files };
  for (const [file, value] of Object.entries(all)) {
    if (value !== null) writeFileSync(join(dir, file), typeof value === 'string' ? value : JSON.stringify(value));
  }
  return { root, dir };
}
const io = () => { const o = { out: '', err: '' }; return { o, io: { out: { write: (s) => { o.out += s; } }, err: { write: (s) => { o.err += s; } } } }; };
const noopener = () => { const calls = []; return { calls, fn: (p) => { calls.push(p); } }; };

test('writes report.html and summary.md and prints the summary', () => {
  const { dir } = runDir();
  const { o, io: i } = io();
  const op = noopener();
  assert.equal(main([dir], i, op.fn), 0);
  assert.ok(existsSync(join(dir, 'report.html')));
  const summary = readFileSync(join(dir, 'summary.md'), 'utf8');
  assert.ok(summary.includes('example.com'));
  assert.ok(o.out.startsWith(summary));
  assert.ok(o.out.includes(join(dir, 'report.html')));
  assert.deepEqual(op.calls, []);
});

test('exits 1 when merged.json or run.json is missing', () => {
  for (const missing of ['merged.json', 'run.json']) {
    const { dir } = runDir({ [missing]: null });
    const { o, io: i } = io();
    assert.equal(main([dir], i, noopener().fn), 1);
    assert.ok(o.err.includes(missing));
    assert.ok(!existsSync(join(dir, 'report.html')));
  }
});

test('exits 1 with usage when no folder is given', () => {
  const { o, io: i } = io();
  assert.equal(main([], i, noopener().fn), 1);
  assert.ok(o.err.length > 0);
});

test('a run without telephone.json or judgements.json builds with those sections absent', () => {
  const { dir } = runDir();
  assert.equal(main([dir], io().io, noopener().fn), 0);
  const html = readFileSync(join(dir, 'report.html'), 'utf8');
  for (const id of ['telephone', 'assumptions', 'conflicts', 'not-checked', 'rerun']) assert.ok(!html.includes(`id="section-${id}"`));
  assert.ok(html.includes('id="section-overview"'));
});

test('malformed judgements.json and telephone.json warn, still build, and are listed under not checked', () => {
  const { dir } = runDir({ 'judgements.json': '{not json', 'telephone.json': '[[[' });
  const { o, io: i } = io();
  assert.equal(main([dir], i, noopener().fn), 0);
  assert.match(o.err, /judgements\.json could not be read/);
  assert.match(o.err, /telephone\.json could not be read/);
  const html = readFileSync(join(dir, 'report.html'), 'utf8');
  const section = html.slice(html.indexOf('id="section-not-checked"'));
  assert.ok(section.includes('judgements.json 無法讀取'));
  assert.ok(section.includes('telephone.json 無法讀取'));
});

test('a missing judgements.json or telephone.json builds with no warning', () => {
  const { dir } = runDir();
  const { o, io: i } = io();
  assert.equal(main([dir], i, noopener().fn), 0);
  assert.equal(o.err, '');
});

test('--open calls the opener with the report path; a missing opener result never fails', () => {
  const { dir } = runDir();
  const op = noopener();
  const { o, io: i } = io();
  assert.equal(main([dir, '--open'], i, op.fn), 0);
  assert.deepEqual(op.calls, [join(dir, 'report.html')]);
  const throwing = () => { throw new Error('no browser'); };
  assert.equal(main([dir, '--open'], io().io, throwing), 0);
  assert.ok(o.out.length > 0);
});

test('rerun_of: relative path resolves against the run folder parent, absolute used as is, unreadable gives a note', () => {
  const rerun = { ...RUN, rerun_of: 'run-1' };
  const { root, dir } = runDir({ 'run.json': rerun });
  mkdirSync(join(root, 'run-1'));
  const prev = { ...MERGED, people: [{ ...person, outcome: 'abandoned', left_at: '/older-page' }], personas: [{ persona: 'p1', outcome: 'abandoned', stop_reason: 'leave_urge', left_at: '/older-page', steps: 3 }] };
  writeFileSync(join(root, 'run-1', 'merged.json'), JSON.stringify(prev));
  assert.equal(main([dir], io().io, noopener().fn), 0);
  assert.ok(readFileSync(join(dir, 'report.html'), 'utf8').includes('/older-page'));

  const abs = runDir({ 'run.json': { ...RUN, rerun_of: join(root, 'run-1') } });
  assert.equal(main([abs.dir], io().io, noopener().fn), 0);
  assert.ok(readFileSync(join(abs.dir, 'report.html'), 'utf8').includes('/older-page'));

  const gone = runDir({ 'run.json': { ...RUN, rerun_of: 'nowhere' } });
  assert.equal(main([gone.dir], io().io, noopener().fn), 0);
  assert.ok(readFileSync(join(gone.dir, 'report.html'), 'utf8').includes('id="section-rerun"'));
});

test('a rerun_of that resolves to its own run folder counts as no previous run', () => {
  const { previous_missing: missing } = labelsFor('zh-TW');
  const htmlFor = (rerunOf) => {
    const { root, dir } = runDir();
    symlinkSync(dir, join(root, 'alias'));
    const value = typeof rerunOf === 'function' ? rerunOf(dir) : rerunOf;
    writeFileSync(join(dir, 'run.json'), JSON.stringify({ ...RUN, rerun_of: value }));
    assert.equal(main([dir], io().io, noopener().fn), 0);
    return readFileSync(join(dir, 'report.html'), 'utf8');
  };
  for (const rerunOf of ['run-2', './run-2/', (dir) => dir, 'alias']) {
    assert.ok(htmlFor(rerunOf).includes(missing), `rerun_of ${rerunOf}`);
  }
});

test('raw judgements and telephone are gated: valid ref shows the step thought, untaken step shows nothing, chain shows three hops', () => {
  const judgements = { assumptions: [{ claim: '先看價格', happened: '真的', evidence: [{ persona: 'p1', step: 1 }, { persona: 'p1', step: 42 }] }] };
  const telephone = { chains: [{ from: 'p1', hops: ['第二手說法', '第三手說法'], comment: null }] };
  const { dir } = runDir({ 'judgements.json': judgements, 'telephone.json': telephone });
  assert.equal(main([dir], io().io, noopener().fn), 0);
  const html = readFileSync(join(dir, 'report.html'), 'utf8');
  const section = html.slice(html.indexOf('id="section-assumptions"'));
  assert.ok(section.includes('想法1'));
  assert.ok(!section.includes('42'));
  assert.equal((section.match(/class="ref"/g) ?? []).length, 1);
  for (const hop of ['不錯', '第二手說法', '第三手說法']) assert.ok(html.includes(hop));
});

test('valid JSON with the wrong shape builds with those sections absent', () => {
  const { dir } = runDir({ 'judgements.json': { assumptions: [{}], conflicts: [{ sides: 5 }], not_checked: 'x' }, 'telephone.json': { chains: [{}, null] } });
  assert.equal(main([dir], io().io, noopener().fn), 0);
  const html = readFileSync(join(dir, 'report.html'), 'utf8');
  for (const id of ['telephone', 'assumptions', 'conflicts', 'not-checked']) assert.ok(!html.includes(`id="section-${id}"`));
});

test('the absolute report path is printed whether or not --open is given', () => {
  const { dir } = runDir();
  const { o, io: i } = io();
  main([dir], i, noopener().fn);
  assert.ok(o.out.trimEnd().endsWith(join(dir, 'report.html')));
});

const DECIDED = { decided: [{ decision: '不放價格', evidence: [{ persona: 'p1', step: 1 }] }] };

test('decisions.md in the run folder lets a decided entry through', () => {
  const { dir } = runDir({ 'judgements.json': DECIDED, 'decisions.md': '- 不放價格\n' });
  const { io: i } = io();
  assert.equal(main([dir], i, noopener().fn), 0);
  assert.ok(readFileSync(join(dir, 'report.html'), 'utf8').includes('id="section-decided"'));
});

test('without decisions.md a decided entry is dropped and the report still builds with no warning', () => {
  const { dir } = runDir({ 'judgements.json': DECIDED });
  const { o, io: i } = io();
  assert.equal(main([dir], i, noopener().fn), 0);
  assert.ok(!readFileSync(join(dir, 'report.html'), 'utf8').includes('id="section-decided"'));
  assert.equal(o.err, '');
});

test('an unreadable decisions.md warns and the report still builds', () => {
  const { dir } = runDir({ 'judgements.json': DECIDED });
  mkdirSync(join(dir, 'decisions.md'));
  const { o, io: i } = io();
  assert.equal(main([dir], i, noopener().fn), 0);
  assert.match(o.err, /decisions\.md could not be read/);
});

const CONTENT = { issues: [{ kind: 'out_of_date', a: { route: '/', quote: '截至2025年' }, why: '過期' }] };

test('content.json in the run folder reaches the report', () => {
  const { dir } = runDir({ 'content.json': CONTENT });
  const { io: i } = io();
  assert.equal(main([dir], i, noopener().fn), 0);
  assert.ok(readFileSync(join(dir, 'report.html'), 'utf8').includes('id="section-content"'));
});

test('a missing content.json builds with no warning', () => {
  const { dir } = runDir();
  const { o, io: i } = io();
  assert.equal(main([dir], i, noopener().fn), 0);
  assert.equal(o.err, '');
});

test('a malformed content.json warns and the report still builds', () => {
  const { dir } = runDir({ 'content.json': '{not json' });
  const { o, io: i } = io();
  assert.equal(main([dir], i, noopener().fn), 0);
  assert.match(o.err, /content\.json could not be read/);
  const html = readFileSync(join(dir, 'report.html'), 'utf8');
  const section = html.slice(html.indexOf('id="section-not-checked"'));
  assert.ok(section.includes('content.json'));
});
