import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPeople, tallyApple, isSafeRelativePath, peopleProblem } from '../skills/launch/scripts/stories.mjs';

const tempDirs = [];
after(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

const CARD = { id: 'p1-on-the-go', base: 'on-the-go', name: '小珍', situation: 's', why_chosen: 'w', arrival: 'a', apple_pitch: 'p' };

const step = (n, screenshot = `screens/0${n}.png`) => ({
  step: n, route: '/', action: 'looked', expected: 'x', saw: 'y', screenshot,
  cw: {}, progress: true, leave_urge: 1, thought: `thought ${n}`, feeling: 'fine',
});

function makeRun(id, files) {
  const runDir = mkdtempSync(join(tmpdir(), 'stories-'));
  tempDirs.push(runDir);
  mkdirSync(join(runDir, id, 'screens'), { recursive: true });
  for (const file of files) writeFileSync(join(runDir, id, file), 'png');
  return runDir;
}

const summaryWith = (extra = {}) => ({
  outcome: 'abandoned', stop_reason: 'no_progress_limit', left_at: '/x', came_for: 'c',
  last_words: null, apple: null, launch_comment: null, ...extra,
});

test('keeps a step whose screenshot exists and drops one whose file is missing', () => {
  const runDir = makeRun('p1-on-the-go', ['screens/01.png']);
  const { people, dropped } = buildPeople([CARD], [{ id: 'p1-on-the-go', summary: summaryWith(), trace: [step(1), step(2)] }], runDir);
  assert.deepEqual(people[0].steps.map((s) => s.step), [1]);
  assert.equal(dropped.length, 1);
  assert.equal(dropped[0].kind, 'thought');
  assert.equal(dropped[0].step, 2);
  assert.match(dropped[0].reason, /screenshot missing/);
});

test('drops steps whose screenshot path escapes the person folder', () => {
  const bads = ['../p2/screens/01.png', '/etc/passwd', 'https://x.test/a.png', 'C:\\a.png', 'screens/../../a.png', '', '\\a.png'];
  for (const bad of bads) assert.equal(isSafeRelativePath(bad), false, bad);
  assert.equal(isSafeRelativePath('screens/01.png'), true);
  assert.equal(isSafeRelativePath('screens/01.PNG'), true);
  const runDir = makeRun('p1-on-the-go', []);
  const trace = bads.map((bad, i) => step(i + 1, bad));
  const { people, dropped } = buildPeople([CARD], [{ id: 'p1-on-the-go', summary: null, trace }], runDir);
  assert.equal(people[0].steps.length, 0);
  assert.ok(dropped.every((d) => d.kind === 'thought' && /unsafe screenshot path/.test(d.reason)));
});

test('step screenshots become run-relative paths', () => {
  const runDir = makeRun('p1-on-the-go', ['screens/03.png']);
  const { people } = buildPeople([CARD], [{ id: 'p1-on-the-go', summary: null, trace: [step(3)] }], runDir);
  assert.equal(people[0].steps[0].screenshot, 'p1-on-the-go/screens/03.png');
  assert.equal(people[0].steps[0].thought, 'thought 3');
});

test('last words citing only untraced steps are dropped', () => {
  const runDir = makeRun('p1-on-the-go', ['screens/01.png']);
  const summary = summaryWith({
    last_words: { would_return: 'no', why: 'w', tell_a_friend: 't', steps: [9] },
    launch_comment: { text: 'hi', steps: [1, 2] },
  });
  const { people, dropped } = buildPeople([CARD], [{ id: 'p1-on-the-go', summary, trace: [step(1), step(2)] }], runDir);
  assert.equal(people[0].last_words, null);
  assert.deepEqual(people[0].launch_comment, { text: 'hi', steps: [1] });
  const entry = dropped.find((d) => d.kind === 'last_words');
  assert.deepEqual([entry.step, entry.reason], [null, 'no traced step']);
});

test('a person blocked at step 1 with no summary still appears', () => {
  const runDir = makeRun('p3', []);
  const { people } = buildPeople([], [{ id: 'p3', summary: null, trace: [] }], runDir);
  assert.equal(people.length, 1);
  assert.equal(people[0].outcome, null);
  assert.deepEqual(people[0].steps, []);
  assert.equal(people[0].last_words, null);
});

test('a card missing for an id falls back to the id as name', () => {
  const runDir = makeRun('p3', []);
  const { people } = buildPeople([], [{ id: 'p3', summary: null, trace: [] }], runDir);
  assert.equal(people[0].name, 'p3');
  assert.equal(people[0].situation, '');
});

test('apple is kept as is and card fields are copied', () => {
  const runDir = makeRun('p1-on-the-go', []);
  const apple = { answer: 'yes', why: 'w' };
  const { people } = buildPeople([CARD], [{ id: 'p1-on-the-go', summary: summaryWith({ apple }), trace: [] }], runDir);
  assert.deepEqual(people[0].apple, apple);
  assert.equal(people[0].name, '小珍');
  assert.equal(people[0].base, 'on-the-go');
  assert.equal(people[0].came_for, 'c');
});

test('tallyApple warns only when more than half said yes', () => {
  const p = (answer) => ({ apple: answer ? { answer, why: '' } : null });
  assert.deepEqual(tallyApple([p('yes'), p('yes'), p('no')]), { asked: 3, yes: 2, no: 1, unsure: 0, warn: true });
  assert.equal(tallyApple([p('yes'), p('no'), p('unsure')]).warn, false);
  assert.equal(tallyApple([p('yes'), p('no')]).warn, false);
  assert.deepEqual(tallyApple([]), { asked: 0, yes: 0, no: 0, unsure: 0, warn: false });
  assert.equal(tallyApple([p(null)]).asked, 0);
});

test('peopleProblem validates run.json people', () => {
  assert.equal(peopleProblem(undefined), null);
  assert.equal(peopleProblem([CARD]), null);
  assert.match(peopleProblem('x'), /people/);
  assert.match(peopleProblem([{ id: 1 }]), /people/);
  assert.match(peopleProblem([null]), /people/);
});

const ONE = [{ id: 'p1-on-the-go', summary: null, trace: [] }];
const cardWith = (extra) => buildPeople([{ ...CARD, ...extra }], ONE, makeRun('p1-on-the-go', [])).people[0];

test('facts, about, cares, voice and why_chosen are carried from the card onto the person', () => {
  const person = cardWith({ facts: ['28 歲', '外送員'], about: '養了六年。', cares: ['有沒有開'], voice: '講話很短', why_chosen: '緊急' });
  assert.deepEqual(person.facts, ['28 歲', '外送員']);
  assert.equal(person.about, '養了六年。');
  assert.deepEqual(person.cares, ['有沒有開']);
  assert.equal(person.voice, '講話很短');
  assert.equal(person.why_chosen, '緊急');
});

test('a card without them gets empty values', () => {
  const person = buildPeople([{ id: 'p1-on-the-go' }], ONE, makeRun('p1-on-the-go', [])).people[0];
  assert.deepEqual([person.facts, person.about, person.cares, person.voice, person.why_chosen], [[], '', [], '', '']);
});

test('anything that is not an array becomes an empty list and anything that is not a string becomes empty text', () => {
  const person = cardWith({ facts: 'one', about: 5, cares: { a: 1 }, voice: ['x'], why_chosen: null });
  assert.deepEqual([person.facts, person.about, person.cares, person.voice, person.why_chosen], [[], '', [], '', '']);
});

test('empty strings and non-strings are dropped from the lists', () => {
  const person = cardWith({ facts: ['a', '', '   ', 3, null, 'b'], cares: ['', 'c'] });
  assert.deepEqual(person.facts, ['a', 'b']);
  assert.deepEqual(person.cares, ['c']);
});

test('a missing card still gives empty values', () => {
  const { people } = buildPeople([], ONE, makeRun('p1-on-the-go', []));
  assert.deepEqual([people[0].facts, people[0].about, people[0].cares, people[0].voice], [[], '', [], '']);
});

test('a screenshot path must be a .png and may not hide dots or slashes behind percent-escapes', () => {
  const bads = ['screens/x.html', 'screens/x', 'screens/x.png.html', '%2e%2e/%2e%2e/x.png', '%2E%2E/x.png', 'screens%2fx.png', 'screens%5Cx.png', 'a/%2e/x.png'];
  for (const bad of bads) assert.equal(isSafeRelativePath(bad), false, bad);
  const runDir = makeRun('p1-on-the-go', ['screens/x.html']);
  const { people, dropped } = buildPeople([CARD], [{ id: 'p1-on-the-go', summary: null, trace: [step(1, 'screens/x.html')] }], runDir);
  assert.equal(people[0].steps.length, 0);
  assert.match(dropped[0].reason, /unsafe/);
});
