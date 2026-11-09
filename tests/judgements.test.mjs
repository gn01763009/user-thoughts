import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateJudgements, gateTelephone } from '../skills/launch/scripts/judgements.mjs';

const mkStep = (n) => ({ step: n, route: '/', action: 'a', thought: `thought ${n}`, feeling: 'fine', screenshot: `p1/screens/0${n}.png`, progress: true });
const p1 = {
  id: 'p1', name: '小珍', steps: [mkStep(1), mkStep(2)],
  last_words: { would_return: 'maybe', why: 'w', tell_a_friend: 'friend line', steps: [1] },
};
const p2 = { id: 'p2', name: '阿明', steps: [mkStep(3)], last_words: null };
const people = [p1, p2];
const ref = (persona, step, extra = {}) => ({ persona, step, ...extra });

test('a reason pointing at a step the person never took is removed', () => {
  const out = gateJudgements({ conflicts: [{ question: 'q', sides: [
    { label: 'a', reasons: [ref('p1', 1), ref('p1', 9)] },
    { label: 'b', reasons: [ref('p2', 3), ref('nobody', 1)] },
  ], vision_note: 'v' }] }, people);
  assert.equal(out.conflicts.length, 1);
  assert.equal(out.conflicts[0].sides[0].reasons.length, 1);
  const bad = out.dropped.filter((d) => d.kind === 'reason');
  assert.equal(bad.length, 2);
  assert.deepEqual([bad[0].persona, bad[0].step], ['p1', 9]);
  assert.match(bad[0].reason, /step not taken/);
  assert.match(bad[1].reason, /unknown person/);
});

test('reasons carry the person’s own thought, not coordinator text', () => {
  const out = gateJudgements({ conflicts: [{ question: 'q', sides: [
    { label: 'a', reasons: [ref('p1', 2, { says: 'invented' })] },
    { label: 'b', reasons: [ref('p2', 3, { quote: 'invented' })] },
  ] }] }, people);
  const r = out.conflicts[0].sides[0].reasons[0];
  assert.deepEqual(r, { persona: 'p1', name: '小珍', step: 2, thought: 'thought 2', feeling: 'fine', screenshot: 'p1/screens/02.png' });
  assert.ok(!JSON.stringify(out).includes('invented'));
  assert.equal(out.conflicts[0].vision_note, '');
});

test('a side with no reasons left is removed; a conflict with fewer than two sides is dropped', () => {
  const out = gateJudgements({ conflicts: [{ question: 'q', sides: [
    { label: 'a', reasons: [ref('p1', 1)] },
    { label: 'b', reasons: [ref('p1', 7)] },
  ] }, { question: '', sides: [] }] }, people);
  assert.equal(out.conflicts.length, 0);
  const d = out.dropped.filter((x) => x.kind === 'conflict');
  assert.equal(d.length, 2);
  assert.equal(d[0].step, null);
});

test('an assumption with no valid evidence becomes not_encountered and loses its happened text', () => {
  const out = gateJudgements({ assumptions: [
    { claim: 'c1', happened: 'it happened', evidence: [ref('p1', 5)] },
    { claim: 'c2', happened: 'x', evidence: [] },
    { claim: 'c3', happened: 'yes', evidence: [ref('p1', 1)] },
    { claim: '', happened: 'x', evidence: [] },
    { claim: 'c5', happened: 42, evidence: [ref('p1', 1)] },
  ] }, people);
  assert.deepEqual(out.assumptions.map((a) => [a.claim, a.status, a.happened]),
    [['c1', 'not_encountered', null], ['c2', 'not_encountered', null], ['c3', 'seen', 'yes']]);
  assert.equal(out.assumptions[2].evidence[0].thought, 'thought 1');
  assert.equal(out.dropped.filter((d) => d.kind === 'evidence').length, 1);
  assert.equal(out.dropped.filter((d) => d.kind === 'judgements').length, 2);
});

test('not_checked keeps only non-empty strings', () => {
  const out = gateJudgements({ not_checked: ['a', '  ', '', 3, null, 'b'] }, people);
  assert.deepEqual(out.not_checked, ['a', 'b']);
});

test('non-object input yields empty sections and one dropped entry', () => {
  for (const bad of ['x', null, undefined, [], 5]) {
    const out = gateJudgements(bad, people);
    assert.deepEqual(out, { assumptions: [], conflicts: [], real_checks: [], test_limits: [], not_checked: [],
      dropped: [{ persona: null, kind: 'judgements', step: null, reason: out.dropped[0].reason }] });
  }
  assert.equal(gateTelephone('x', people).dropped[0].kind, 'telephone');
});

test('a non-array section is empty with one dropped entry', () => {
  const out = gateJudgements({ assumptions: 'no', conflicts: {}, not_checked: [] }, people);
  assert.equal(out.dropped.length, 2);
  assert.ok(out.dropped.every((d) => d.kind === 'judgements'));
});

test('inputs are not mutated', () => {
  const raw = { assumptions: [{ claim: 'c', happened: 'h', evidence: [ref('p1', 1)] }] };
  const before = JSON.stringify([raw, people]);
  gateJudgements(raw, people);
  assert.equal(JSON.stringify([raw, people]), before);
});

test('a chain from a person without last words is dropped', () => {
  const out = gateTelephone({ chains: [
    { from: 'p2', hops: ['a', 'b'] }, { from: 'ghost', hops: ['a', 'b'] }, { hops: ['a', 'b'] },
  ] }, people);
  assert.equal(out.chains.length, 0);
  assert.deepEqual(out.dropped.map((d) => [d.kind, d.persona, d.step]),
    [['chain', 'p2', null], ['chain', 'ghost', null], ['chain', null, null]]);
});

test('a chain needs exactly two non-empty hops; hops[0] becomes the person’s tell_a_friend', () => {
  const out = gateTelephone({ chains: [
    { from: 'p1', hops: ['r1', 'r2'], comment: '  nice  ' },
    { from: 'p1', hops: ['r1'] },
    { from: 'p1', hops: ['r1', 'r2', 'r3'] },
    { from: 'p1', hops: ['r1', ' '] },
    { from: 'p1', hops: ['r1', 'r2'], comment: 5 },
  ] }, people);
  assert.equal(out.chains.length, 2);
  assert.deepEqual(out.chains[0], { from: 'p1', name: '小珍', hops: ['friend line', 'r1', 'r2'], comment: 'nice' });
  assert.equal(out.chains[1].comment, null);
  assert.equal(out.dropped.length, 3);
});

test('a test limit keeps its kind and note and shows the person\'s own step', () => {
  const out = gateJudgements({ test_limits: [{ limit: 'location', note: '沒有位置', evidence: [ref('p1', 2, { says: 'invented' })] }] }, people);
  assert.deepEqual(out.test_limits, [{ limit: 'location', note: '沒有位置', evidence: [
    { persona: 'p1', name: '小珍', step: 2, thought: 'thought 2', feeling: 'fine', screenshot: 'p1/screens/02.png' },
  ] }]);
  assert.ok(!JSON.stringify(out).includes('invented'));
});

test('a test limit with an unknown kind, no note or no valid step is dropped', () => {
  const out = gateJudgements({ test_limits: [
    { limit: 'weather', note: 'n', evidence: [ref('p1', 1)] },
    { limit: 'location', note: '', evidence: [ref('p1', 1)] },
    { limit: 'location', note: 'n', evidence: [ref('p1', 9)] },
  ] }, people);
  assert.deepEqual(out.test_limits, []);
  assert.equal(out.dropped.filter((d) => d.kind === 'test_limit').length, 3);
});

test('judgements without test_limits, or not an object, give an empty list', () => {
  assert.deepEqual(gateJudgements({}, people).test_limits, []);
  assert.deepEqual(gateJudgements(null, people).test_limits, []);
});

test('a real check keeps who and ask and shows the person\'s own step', () => {
  const out = gateJudgements({ real_checks: [{ who: 'w', ask: 'a', evidence: [ref('p1', 1)] }] }, people);
  assert.equal(out.real_checks[0].who, 'w');
  assert.equal(out.real_checks[0].ask, 'a');
  assert.equal(out.real_checks[0].evidence[0].thought, 'thought 1');
});

test('a real check without who, ask or a valid step is dropped', () => {
  const out = gateJudgements({ real_checks: [
    { who: '', ask: 'a', evidence: [ref('p1', 1)] },
    { who: 'w', ask: '', evidence: [ref('p1', 1)] },
    { who: 'w', ask: 'a', evidence: [ref('p1', 9)] },
  ] }, people);
  assert.deepEqual(out.real_checks, []);
  assert.equal(out.dropped.filter((d) => d.kind === 'real_check').length, 3);
});

test('at most six real checks are kept', () => {
  const entries = Array.from({ length: 8 }, (_, i) => ({ who: `w${i}`, ask: 'a', evidence: [ref('p1', 1)] }));
  assert.deepEqual(gateJudgements({ real_checks: entries }, people).real_checks.map((c) => c.who), ['w0', 'w1', 'w2', 'w3', 'w4', 'w5']);
});
