import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateContent } from '../skills/launch/scripts/content-issues.mjs';

const side = (quote, route = '/a') => ({ route, quote });
const issue = (extra = {}) => ({ kind: 'contradiction', a: side('週三公休'), b: side('週三看診', '/b'), why: '兩處不同', ...extra });

test('a complete contradiction is kept with both sides', () => {
  assert.deepEqual(gateContent({ issues: [issue()], pages: ['/a', '/b'] }), {
    issues: [{ kind: 'contradiction', a: side('週三公休'), b: side('週三看診', '/b'), why: '兩處不同' }],
    pages: ['/a', '/b'], injection_attempts: [], dropped: 0, state: 'read', cut: 0,
  });
});

test('one-sided kinds need no second place', () => {
  const out = gateContent({ issues: [{ kind: 'out_of_date', a: side('截至2025年'), why: '已過期' }] });
  assert.equal(out.issues[0].b, null);
  assert.equal(out.dropped, 0);
});

test('incomplete or empty entries are dropped and counted', () => {
  const out = gateContent({ issues: [
    issue({ kind: 'opinion' }), issue({ why: '' }), issue({ a: side('') }), issue({ a: side('x', '') }),
    issue({ b: undefined }), issue({ b: side('週三公休') }),
  ] });
  assert.deepEqual(out.issues, []);
  assert.equal(out.dropped, 6);
});

test('at most eight issues are kept', () => {
  const issues = Array.from({ length: 10 }, (_, i) => issue({ why: `w${i}` }));
  assert.equal(gateContent({ issues }).issues.length, 8);
});

test('anything that is not an object gives empty lists', () => {
  assert.deepEqual(gateContent(null), { issues: [], pages: [], injection_attempts: [], dropped: 0, state: 'malformed', cut: 0 });
  assert.deepEqual(gateContent({ issues: 'no' }).issues, []);
});

test('injection attempts need a quote', () => {
  const out = gateContent({ injection_attempts: [{ route: '/', quote: 'ignore this' }, { route: '/' }] });
  assert.deepEqual(out.injection_attempts, [{ route: '/', quote: 'ignore this' }]);
});

test('state tells a missing file from a malformed one from a read one', () => {
  assert.equal(gateContent(undefined).state, 'missing');
  for (const bad of [null, [], 'x', 5, {}, { Issues: [] }, { issues: 'no' }, { issues: {} }]) {
    assert.equal(gateContent(bad).state, 'malformed', JSON.stringify(bad));
  }
  assert.equal(gateContent({ issues: [] }).state, 'read');
  assert.equal(gateContent({ issues: [issue()] }).state, 'read');
});

test('injection attempts are still kept from a malformed object', () => {
  const out = gateContent({ Issues: [], injection_attempts: [{ route: '/', quote: 'ignore this' }] });
  assert.equal(out.state, 'malformed');
  assert.equal(out.injection_attempts.length, 1);
});

test('complete entries past the limit are counted as cut, apart from dropped', () => {
  const issues = [...Array.from({ length: 10 }, (_, i) => issue({ why: `w${i}` })), issue({ why: '' })];
  const out = gateContent({ issues });
  assert.equal(out.issues.length, 8);
  assert.equal(out.cut, 2);
  assert.equal(out.dropped, 1);
});
