import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANSWERS, MAX_CHANGES, gateQuestion, gateChanges } from '../skills/launch/scripts/answer.mjs';

const deepFreeze = (v) => {
  if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v).forEach(deepFreeze);
  }
  return v;
};
const mkStep = (n, extra = {}) => ({ step: n, route: `/r${n}`, action: 'a', thought: `thought ${n}`, feeling: 'fine', screenshot: `s/0${n}.png`, expected: `exp ${n}`, saw: `saw ${n}`, ...extra });
const p1 = { id: 'p1', name: '小珍', steps: [mkStep(1), mkStep(2), mkStep(3)] };
const p2 = { id: 'p2', name: '阿明', steps: [mkStep(1), { step: 3, route: '/r3', action: 'a', thought: 't', feeling: 'f', screenshot: 's', saw: '' }] };
const people = [p1, p2];
const ref = (persona, step) => ({ persona, step });
const q = (answer, extra = {}) => ({ answer, happened: '  it went so  ', breaks: [], evidence: [], ...extra });

test('constants', () => {
  assert.deepEqual(ANSWERS, ['holds', 'partly', 'does_not_hold', 'not_reached']);
  assert.equal(MAX_CHANGES, 3);
});

test('holds with a resolved evidence step is answered', () => {
  const out = gateQuestion(deepFreeze(q('holds', { evidence: [ref('p1', 2)] })), deepFreeze(people));
  assert.equal(out.status, 'answered');
  assert.equal(out.answer, 'holds');
  assert.equal(out.happened, 'it went so');
  assert.deepEqual(out.evidence[0], { persona: 'p1', name: '小珍', step: 2, thought: 'thought 2', feeling: 'fine', screenshot: 's/02.png', route: '/r2', expected: 'exp 2', saw: 'saw 2' });
  assert.deepEqual(out.dropped, []);
});

test('holds with only breaks, or unresolved evidence, is bad_evidence', () => {
  for (const raw of [q('holds', { breaks: [ref('p1', 1)] }), q('holds', { evidence: [ref('p1', 9)] })]) {
    const out = gateQuestion(raw, people);
    assert.equal(out.status, 'bad_evidence');
    assert.equal(out.answer, null);
  }
});

test('partly and does_not_hold need a resolved breaks step', () => {
  for (const a of ['partly', 'does_not_hold']) {
    const ok = gateQuestion(q(a, { breaks: [ref('p2', 1)] }), people);
    assert.deepEqual([ok.status, ok.answer], ['answered', a]);
    const bad = gateQuestion(q(a, { evidence: [ref('p1', 1)], breaks: [ref('nobody', 1)] }), people);
    assert.deepEqual([bad.status, bad.answer], ['bad_evidence', null]);
    assert.match(bad.dropped[0].reason, /unknown person/);
    assert.equal(bad.dropped[0].kind, 'breaks');
  }
});

test('not_reached needs nothing and drops any cited steps with a reason', () => {
  const out = gateQuestion(q('not_reached', { breaks: [ref('p1', 1)], evidence: [ref('p2', 1), ref('nobody', 4)] }), people);
  assert.deepEqual([out.status, out.answer], ['not_reached', 'not_reached']);
  assert.deepEqual([out.breaks, out.evidence], [[], []]);
  assert.equal(out.dropped.length, 3);
  assert.ok(out.dropped.every((d) => /not reached/.test(d.reason)));
  assert.deepEqual(out.dropped.map((d) => d.kind), ['breaks', 'evidence', 'evidence']);
  assert.deepEqual([out.dropped[2].persona, out.dropped[2].step], ['nobody', 4]);
});

test('missing, unknown or malformed answers are unanswered', () => {
  for (const raw of [undefined, null, 'holds', [], q(undefined), q('maybe'), q(7)]) {
    const out = gateQuestion(raw, people);
    assert.deepEqual([out.status, out.answer], ['unanswered', null]);
    assert.deepEqual([out.breaks, out.evidence], [[], []]);
  }
  assert.equal(gateQuestion(undefined, people).happened, '');
});

test('keys absent on the step stay absent on the ref', () => {
  const out = gateQuestion(q('holds', { evidence: [ref('p2', 3)] }), people);
  const r = out.evidence[0];
  assert.ok(!('expected' in r));
  assert.equal(r.saw, '');
  assert.equal(r.route, '/r3');
});

test('breaks and evidence sort by step, then by position in people', () => {
  const raw = q('partly', { breaks: [ref('p2', 3), ref('p1', 3), ref('p2', 1), ref('p1', 2), ref('p1', 1)], evidence: [ref('p1', 3), ref('p1', 1)] });
  const out = gateQuestion(raw, people);
  assert.deepEqual(out.breaks.map((r) => `${r.persona}#${r.step}`), ['p1#1', 'p2#1', 'p1#2', 'p1#3', 'p2#3']);
  assert.deepEqual(out.evidence.map((r) => r.step), [1, 3]);
  const reversed = gateQuestion(raw, [p2, p1]);
  assert.deepEqual(reversed.breaks.map((r) => `${r.persona}#${r.step}`), ['p2#1', 'p1#1', 'p1#2', 'p2#3', 'p1#3']);
});

const findings = [
  { fingerprint: 'f1', route: '/a', element: { role: 'button', name: 'Buy' }, verification: 'confirmed' },
  { fingerprint: 'f2', route: '/b', verification: 'confirmed' },
  { fingerprint: 'f3', route: '/c', element: { name: 'X' }, verification: 'not_reproduced' },
  { fingerprint: 'f4', route: '/d', verification: 'unable' },
  { fingerprint: 'f5', route: '/e', verification: null },
];
const ch = (finding, extra = {}) => ({ change: ' fix it ', finding, evidence: [ref('p1', 1)], ...extra });

test('a confirmed change with a resolved step is kept in the stated shape', () => {
  const out = gateChanges(deepFreeze([ch('f1'), ch('f2')]), deepFreeze(people), deepFreeze(findings));
  assert.equal(out.changes.length, 2);
  assert.deepEqual(out.changes[0].finding, { fingerprint: 'f1', route: '/a', name: 'Buy' });
  assert.equal(out.changes[1].finding.name, '');
  assert.equal(out.changes[0].change, 'fix it');
  assert.equal(out.changes[0].evidence[0].route, '/r1');
  assert.deepEqual(out.dropped, []);
});

test('every change drop reason', () => {
  const raw = [
    ch('f1', { change: '  ' }), ch('nope'), ch('f3'), ch('f4'), ch('f5'),
    ch('f1', { evidence: [ref('p1', 9)] }), ch('f1', { evidence: undefined }), 'junk',
  ];
  const out = gateChanges(raw, people, findings);
  assert.equal(out.changes.length, 0);
  const reasons = out.dropped.filter((d) => d.kind === 'change').map((d) => d.reason);
  assert.deepEqual(reasons, [
    'change without text', 'unknown finding', 'finding not confirmed on the page', 'finding not confirmed on the page',
    'finding not confirmed on the page', 'change without a valid step', 'change without a valid step', 'change without text',
  ]);
  assert.ok(out.dropped.some((d) => d.kind === 'evidence' && /step not taken/.test(d.reason)));
});

test('only the first 3 valid changes are kept; extras are dropped', () => {
  const raw = [ch('f1'), ch('nope'), ch('f1'), ch('f2'), ch('f1'), ch('f2')];
  const out = gateChanges(raw, people, findings);
  assert.equal(out.changes.length, MAX_CHANGES);
  const extra = out.dropped.filter((d) => d.reason === 'more than 3 changes');
  assert.equal(extra.length, 2);
});

test('changes undefined is nothing; not an array is one drop', () => {
  assert.deepEqual(gateChanges(undefined, people, findings), { changes: [], dropped: [] });
  const out = gateChanges({ a: 1 }, people, findings);
  assert.deepEqual(out.changes, []);
  assert.equal(out.dropped.length, 1);
});
