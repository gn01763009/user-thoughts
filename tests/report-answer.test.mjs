// The question-first top of the report: model, page, escaping, folding and rerun comparison.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { labelsFor } from '../skills/launch/scripts/labels.mjs';
import { buildReportModel } from '../skills/launch/scripts/report-model.mjs';
import { renderReport } from '../skills/launch/scripts/render-html.mjs';
import { renderSummary } from '../skills/launch/scripts/render-summary.mjs';
import { main } from '../skills/launch/scripts/build-report.mjs';

const XSS = '<script>alert(1)</script> javascript:alert(1)';
const step = (n, extra = {}) => ({
  step: n, route: `/page${n}`, action: `a${n}`, thought: `thought ${n}`, feeling: 'confused', screenshot: `s${n}.png`, progress: true, ...extra,
});
const person = (id, name, extra = {}) => ({
  id, name, situation: `${name} situation`, why_chosen: `${name} why`, came_for: 'c', arrival: `${name} arrival`,
  outcome: 'abandoned', stop_reason: 'leave_urge', left_at: '/x',
  steps: [step(1, { expected: `${name} expected`, saw: `${name} saw` }), step(2)], last_words: null, apple: null, launch_comment: null, ...extra,
});
const people = () => [person('p1', 'Dana'), person('p2', 'Kai'), person('p3', 'Mei', { outcome: 'completed' })];
const finding = (fingerprint, verification) => ({ fingerprint, severity: 'high', band: 'main', route: '/page1', verification, element: { name: `el-${fingerprint}` }, sources: [] });
const mergedOf = (list = people()) => ({
  run: {}, personas: [], dropped_voices: [], people: list, apple: { asked: 1, yes: 0, no: 1, unsure: 0, warn: false },
  findings: [finding('f1', 'confirmed'), finding('f2', 'unable'), finding('f3', 'confirmed')],
});
const runOf = (extra = {}) => ({
  url: 'https://example.com/', date: '2026-11-25', depth: 'standard', language: 'en', vision: 'v', understanding: 'u',
  personas: ['p1', 'p2', 'p3'], question: 'Is the new home page clear?', ...extra,
});
const JUDGED = () => ({
  question: { answer: 'partly', happened: 'Dana and Kai got stuck.', breaks: [{ persona: 'p2', step: 1 }, { persona: 'p1', step: 1 }], evidence: [{ persona: 'p3', step: 2 }] },
  changes: [
    { change: 'Say what the product is in the heading', finding: 'f1', evidence: [{ persona: 'p1', step: 1 }] },
    { change: 'Unverified idea', finding: 'f2', evidence: [{ persona: 'p1', step: 1 }] },
  ],
});
const build = (judgements = JUDGED(), run = runOf(), extra = {}) => buildReportModel({ run, merged: mergedOf(), judgements, telephone: undefined, previous: null, ...extra });
const html = (model) => renderReport(model, labelsFor(model.language));
const en = labelsFor('en');
const zh = labelsFor('zh-TW');

test('model: no question gives null and empty fields', () => {
  for (const q of [undefined, '', '   ', 5]) {
    const m = build(JUDGED(), runOf({ question: q }));
    assert.equal(m.question, null);
    assert.deepEqual(m.changes, []);
    assert.deepEqual(m.people_intro, []);
  }
});

test('model: question, gated changes, people intro and dropped count', () => {
  const m = build();
  assert.equal(m.question.text, 'Is the new home page clear?');
  assert.equal(m.question.is_default, false);
  assert.equal(m.question.status, 'answered');
  assert.equal(m.question.answer, 'partly');
  assert.equal(m.question.earlier, null);
  assert.deepEqual(m.question.breaks.map((r) => r.name), ['Dana', 'Kai']);
  assert.deepEqual(m.changes.map((c) => c.finding.fingerprint), ['f1']);
  assert.equal(m.dropped_count, 1);
  assert.deepEqual(m.people_intro[0], { id: 'p1', name: 'Dana', situation: 'Dana situation', arrival: 'Dana arrival', why_chosen: 'Dana why' });
  assert.equal(build(JUDGED(), runOf({ question_default: true })).question.is_default, true);
});

test('model: missing judgements gives an unanswered question and no changes', () => {
  const m = buildReportModel({ run: runOf(), merged: mergedOf(), judgements: undefined, telephone: undefined, previous: null });
  assert.equal(m.question.status, 'unanswered');
  assert.deepEqual(m.changes, []);
});

test('model does not mutate frozen inputs', () => {
  const deep = (o) => { Object.values(o).forEach((v) => v && typeof v === 'object' && deep(v)); return Object.freeze(o); };
  assert.doesNotThrow(() => buildReportModel({ run: deep(runOf()), merged: deep(mergedOf()), judgements: deep(JUDGED()), telephone: undefined, previous: null }));
});

test('page: question, answer, breaks with expected and saw and a large screenshot', () => {
  const page = html(build());
  assert.ok(page.includes('Is the new home page clear?'));
  assert.ok(page.includes(en.q_partly));
  assert.ok(page.includes(en.q_breaks_title));
  assert.ok(page.includes('Dana expected') && page.includes('Dana saw'));
  assert.ok(page.includes('class="break-shot" href="s1.png"'));
  assert.ok(page.indexOf('Dana · Step 1') < page.indexOf('Kai · Step 1'));
  assert.ok(page.includes(en.single_run_note));
  assert.match(page, /\.break-shot img\{[^}]*max-width:min\(100%,760px\)/);
  assert.ok(!page.includes(en.q_default));
});

test('page: default question is tagged', () => {
  assert.ok(html(build(JUDGED(), runOf({ question_default: true }))).includes(en.q_default));
});

test('page: each status prints its own line, not_reached shows no breaks', () => {
  const cases = [
    [{ answer: 'holds', evidence: [{ persona: 'p3', step: 1 }] }, en.q_holds],
    [{ answer: 'does_not_hold', breaks: [{ persona: 'p1', step: 1 }] }, en.q_does_not_hold],
    [{ answer: 'does_not_hold', breaks: [{ persona: 'p9', step: 1 }] }, en.q_bad_evidence],
    [{ answer: 'maybe' }, en.q_unanswered],
  ];
  for (const [question, line] of cases) assert.ok(html(build({ question })).includes(line), line);
  const none = html(build({ question: { answer: 'not_reached', happened: 'x', breaks: [{ persona: 'p1', step: 1 }] } }));
  assert.ok(none.includes(en.q_not_reached));
  assert.ok(!none.includes(en.q_breaks_title) && !none.includes('Dana expected'));
  assert.ok(html(build({ question: { answer: 'does_not_hold', breaks: [{ persona: 'p9', step: 1 }] } })).includes(en.q_bad_evidence));
});

test('page: changes are numbered, capped at three, with an offer naming the rerun people', () => {
  const findings = ['a', 'b', 'c', 'd'].map((k) => finding(k, 'confirmed'));
  const changes = findings.map((f, i) => ({ change: `change ${i}`, finding: f.fingerprint, evidence: [{ persona: 'p1', step: 1 }] }));
  const model = buildReportModel({ run: runOf(), merged: { ...mergedOf(), findings }, judgements: { ...JUDGED(), changes }, telephone: undefined, previous: null });
  const page = html(model);
  assert.equal((page.match(/class="change-text"/g) ?? []).length, 3);
  assert.ok(page.includes('--rerun p1, --rerun p2'));
  assert.ok(page.includes('Based on'));
  assert.ok(!page.includes('change 3'));
});

test('page: no changes gives only the one-line note and no offer', () => {
  const page = html(build({ ...JUDGED(), changes: [] }));
  assert.ok(page.includes(en.changes_empty));
  assert.ok(!page.includes('class="change-text"'));
  assert.ok(!page.includes('--rerun'));
});

test('page: no breaks means no offer line', () => {
  const page = html(build({ question: { answer: 'holds', evidence: [{ persona: 'p3', step: 1 }] }, changes: JUDGED().changes }));
  assert.ok(!page.includes('--rerun'));
});

test('page: people intro lists each person and the fixed explanation', () => {
  const page = html(build());
  const intro = page.slice(page.indexOf('id="section-intro"'));
  for (const text of ['Dana arrival', 'Kai situation', 'Mei why', en.intro_how, en.intro_title]) assert.ok(intro.includes(text), text);
});

test('page: hostile text is escaped everywhere it appears', () => {
  const people2 = [person('p1', 'Dana', { steps: [step(1, { expected: XSS, saw: XSS, thought: XSS }), step(2)] })];
  const judged = {
    question: { answer: 'does_not_hold', happened: XSS, breaks: [{ persona: 'p1', step: 1 }] },
    changes: [{ change: XSS, finding: 'f1', evidence: [{ persona: 'p1', step: 1 }] }],
  };
  const model = buildReportModel({ run: runOf({ question: XSS }), merged: mergedOf(people2), judgements: judged, telephone: undefined, previous: null });
  const page = html(model);
  assert.ok(!page.includes('<script>alert'));
  assert.ok(!/href="javascript:/i.test(page));
  assert.ok(page.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.equal(page.split('&lt;script&gt;alert(1)&lt;/script&gt;').length - 1 >= 6, true);
});

test('page: other sections fold in order, in details, with their text intact', () => {
  const m = { ...build(), not_checked: ['nothing about mobile'], real_checks: [{ who: 'a shop owner', ask: 'Ask this', evidence: [] }] };
  const page = html(m);
  const titles = [en.stories_title, en.not_checked_title].map((t) => t.replace("'", '&#39;'));
  const at = titles.map((t) => page.indexOf(`<details class="fold"><summary>${t}</summary>`));
  assert.ok(at.every((i) => i > -1), String(at));
  assert.deepEqual([...at].sort((a, b) => a - b), at);
  assert.ok(page.includes('nothing about mobile') && page.includes('thought 2'));
  assert.ok(page.includes(`<h2 class="list-title">${en.overview_title}</h2>`), 'the overview is still there, inside the stories fold');
  assert.ok(page.indexOf('a shop owner') < at[0], 'real checks stay visible above the folds');
  assert.ok(page.indexOf('id="section-question"') < page.indexOf('id="section-changes"'));
  assert.ok(page.indexOf('id="section-changes"') < page.indexOf('id="section-intro"'));
  assert.ok(!/<script/i.test(page));
});

test('page: warning and injection stay open above the question', () => {
  const merged = { ...mergedOf(), apple: { asked: 3, yes: 3, no: 0, unsure: 0, warn: true }, injection_attempts: [{ persona: 'p1', route: '/x', quote: 'ignore' }] };
  const page = html(buildReportModel({ run: runOf(), merged, judgements: JUDGED(), telephone: undefined, previous: null }));
  const q = page.indexOf('id="section-question"');
  assert.ok(page.indexOf('id="section-apple"') < q && page.indexOf('id="section-injection"') < q);
  assert.ok(!page.slice(0, q).includes('<details class="fold">'));
});

test('labels: new wording has no percent and no "most"', () => {
  const keys = Object.keys(en).filter((k) => /^(q_|changes_|intro_)/.test(k));
  for (const k of keys) {
    assert.doesNotMatch(en[k], /%|\bmost\b/i, k);
    assert.doesNotMatch(zh[k], /%|多數/, k);
  }
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
});

test('zh-TW wording is used for the answer', () => {
  const page = html(build(JUDGED(), runOf({ language: 'zh-TW' })));
  for (const t of [zh.q_title, zh.q_partly, zh.changes_title, zh.q_breaks_title, zh.q_expected]) assert.ok(page.includes(t), t);
});

test('rerun: earlier answer shows beside this one for that person only', () => {
  const previous = mergedOf();
  const previousJudgements = { question: { answer: 'does_not_hold', happened: 'x', breaks: [{ persona: 'p1', step: 1 }, { persona: 'p2', step: 1 }] } };
  const judgements = { question: { answer: 'holds', happened: 'fixed', evidence: [{ persona: 'p1', step: 1 }] } };
  const previousRun = runOf();
  const m = buildReportModel({ run: runOf({ rerun_of: 'run-1', personas: ['p1'] }), merged: mergedOf(), judgements, telephone: undefined, previous, previousJudgements, previousRun });
  assert.equal(m.question.earlier.answer, 'does_not_hold');
  assert.deepEqual(m.question.earlier.breaks.map((r) => r.persona), ['p1']);
  const page = html(m);
  assert.ok(page.includes(en.q_last_time) && page.includes(en.q_this_time));
  assert.ok(page.indexOf(en.q_last_time) < page.indexOf(en.q_this_time));
  const compare = page.slice(page.indexOf('class="q-compare"'), page.indexOf('class="q-compare"') + 2000);
  assert.ok(compare.indexOf(en.q_person_stuck) < compare.indexOf(en.q_person_through), 'last time stuck, this time through');
  assert.ok(compare.includes(en.q_person_stuck) && compare.includes(en.q_person_through));
});

test('rerun: a previous run that asked a different question is not compared', () => {
  const previousJudgements = { question: { answer: 'does_not_hold', happened: 'x', breaks: [{ persona: 'p1', step: 1 }] } };
  const args = { run: runOf({ rerun_of: 'run-1', personas: ['p1'] }), merged: mergedOf(), judgements: JUDGED(), telephone: undefined, previous: mergedOf(), previousJudgements };
  assert.equal(buildReportModel({ ...args, previousRun: runOf({ question: 'Can people find the price?' }) }).question.earlier, null);
  assert.equal(buildReportModel({ ...args, previousRun: runOf({ question: undefined }) }).question.earlier, null);
  assert.equal(buildReportModel({ ...args }).question.earlier, null);
});

test('rerun: last time names what happened to this person, including not reaching it', () => {
  const previousJudgements = { question: { answer: 'partly', happened: 'x', breaks: [{ persona: 'p2', step: 1 }], evidence: [{ persona: 'p3', step: 2 }] } };
  const m = buildReportModel({ run: runOf({ rerun_of: 'run-1', personas: ['p1'] }), merged: mergedOf(), judgements: JUDGED(), telephone: undefined, previous: mergedOf(), previousJudgements, previousRun: runOf() });
  const page = html(m);
  const compare = page.slice(page.indexOf('class="q-compare"'), page.indexOf('class="q-compare"') + 2000);
  assert.ok(compare.includes(en.q_person_not_met));
});

test('who line names as getting through only the people the evidence cites', () => {
  const judgements = { question: { answer: 'does_not_hold', happened: 'h', breaks: [{ persona: 'p1', step: 1 }] } };
  const page = html(build(judgements));
  const who = page.slice(page.indexOf('class="q-who"'), page.indexOf('</p>', page.indexOf('class="q-who"')));
  assert.ok(who.includes('Dana'));
  assert.ok(!who.includes('Mei') && !who.includes('Kai'), who);
  const both = html(build());
  const whoBoth = both.slice(both.indexOf('class="q-who"'), both.indexOf('</p>', both.indexOf('class="q-who"')));
  assert.ok(whoBoth.includes(en.q_not_stuck) && whoBoth.includes('Mei'));
});

test('the single-run note appears once in question mode', () => {
  const page = html(build());
  assert.equal(page.split(en.single_run_note).length - 1, 1);
});

test('break screenshots are capped in height and never scaled up', async () => {
  const { ANSWER_CSS } = await import('../skills/launch/scripts/report-answer-theme.mjs');
  const rule = ANSWER_CSS.split('\n').find((l) => l.startsWith('.break-shot img'));
  assert.match(rule, /max-height:/);
  assert.match(rule, /width:auto/);
});

test('rerun: no previous judgements shows only the current answer', () => {
  const m = buildReportModel({ run: runOf({ rerun_of: 'run-1', personas: ['p1'] }), merged: mergedOf(), judgements: JUDGED(), telephone: undefined, previous: mergedOf() });
  assert.equal(m.question.earlier, null);
  const page = html(m);
  assert.ok(!page.includes(en.q_last_time));
  assert.ok(page.includes(en.q_partly));
});

const dirs = [];
after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });
const sink = () => ({ out: { write: () => {} }, err: { write: () => {} } });

function twoRuns(previousJudged) {
  const root = mkdtempSync(join(tmpdir(), 'report-answer-'));
  dirs.push(root);
  const write = (name, files) => {
    mkdirSync(join(root, name));
    for (const [f, v] of Object.entries(files)) if (v !== null) writeFileSync(join(root, name, f), typeof v === 'string' ? v : JSON.stringify(v));
  };
  write('run-1', { 'run.json': runOf(), 'merged.json': mergedOf(), 'judgements.json': previousJudged });
  write('run-2', {
    'run.json': runOf({ rerun_of: 'run-1', personas: ['p1'] }), 'merged.json': mergedOf(),
    'judgements.json': { question: { answer: 'holds', happened: 'ok', evidence: [{ persona: 'p1', step: 1 }] } },
  });
  return join(root, 'run-2');
}

test('build-report: reads the previous judgements, and ignores a broken file', () => {
  const good = twoRuns({ question: { answer: 'does_not_hold', breaks: [{ persona: 'p1', step: 1 }] } });
  assert.equal(main([good], sink()), 0);
  assert.ok(readFileSync(join(good, 'report.html'), 'utf8').includes(en.q_last_time));
  const bad = twoRuns('{ not json');
  assert.equal(main([bad], sink()), 0);
  assert.ok(!readFileSync(join(bad, 'report.html'), 'utf8').includes(en.q_last_time));
});

// ---- summary.md in question mode ----

const summaryOf = (model) => renderSummary(model, labelsFor(model.language)).trimEnd().split('\n');
const threeChanges = () => {
  const findings = ['a', 'b', 'c', 'd'].map((k) => finding(k, 'confirmed'));
  const changes = findings.map((f, i) => ({ change: `change ${i}`, finding: f.fingerprint, evidence: [{ persona: 'p1', step: 1 }] }));
  return { findings, changes };
};

test('summary: title, question and answer first, three changes, apple, injection and link in at most 8 lines', () => {
  const { findings, changes } = threeChanges();
  const merged = { ...mergedOf(), findings, apple: { asked: 3, yes: 3, no: 0, unsure: 0, warn: true }, injection_attempts: [{ persona: 'p1', route: '/x', quote: 'q' }] };
  const model = buildReportModel({ run: runOf(), merged, judgements: { ...JUDGED(), changes }, telephone: undefined, previous: null });
  const lines = summaryOf(model);
  assert.equal(lines.length, 8);
  assert.ok(lines[0].startsWith('# '));
  assert.ok(lines[1].includes('Is the new home page clear?') && lines[1].includes(en.q_partly));
  assert.deepEqual(lines.slice(2, 5).map((l) => /change (\d)/.exec(l)[1]), ['0', '1', '2']);
  assert.ok(lines[5].includes(en.apple_warning) && lines[6].includes('1') && lines[7].includes('report.html'));
  assert.ok(lines.every((l) => Array.from(l).length <= 120));
});

test('summary: apple line only when it warns, no change lines when none were confirmed', () => {
  const lines = summaryOf(build({ ...JUDGED(), changes: [] }));
  assert.deepEqual(lines.length, 3);
  assert.ok(!lines.some((l) => l.includes(en.apple_title)));
});

test('summary: a long question is cut but the answer stays', () => {
  const lines = summaryOf(build(JUDGED(), runOf({ question: 'Q'.repeat(300) })));
  assert.ok(Array.from(lines[1]).length <= 120);
  assert.ok(lines[1].includes(en.q_partly));
});

test('summary: an answer that cannot be shown says so', () => {
  const lines = summaryOf(build({ question: { answer: 'does_not_hold', breaks: [{ persona: 'p9', step: 1 }] } }));
  assert.ok(lines[1].includes(en.q_bad_evidence));
});

test('with no break shown, the empty-changes note does not point at where it broke', () => {
  const holds = { question: { answer: 'holds', happened: 'h', evidence: [{ persona: 'p3', step: 2 }] } };
  const page = html(build(holds));
  assert.ok(page.includes(en.changes_empty_no_breaks));
  assert.ok(!page.includes(en.changes_empty));
  const broke = html(build({ question: JUDGED().question }));
  assert.ok(broke.includes(en.changes_empty));
});

test('the overview and the people fold together, so a row link lands in an open section in any browser', () => {
  const page = html(build());
  const folds = page.split('<details class="fold">').slice(1).map((chunk) => chunk.slice(0, chunk.indexOf('</details>\n')));
  const withRows = folds.filter((f) => f.includes('href="#person-'));
  assert.equal(withRows.length, 1);
  for (const id of ['p1', 'p2', 'p3']) assert.ok(withRows[0].includes(`id="person-${id}"`), id);
});
