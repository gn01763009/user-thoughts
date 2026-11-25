// A run without a question must render exactly as it did before the question existed.
// Snapshots hold only synthetic data. Regenerate on purpose with UPDATE_SNAPSHOTS=1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { labelsFor } from '../skills/launch/scripts/labels.mjs';
import { buildReportModel } from '../skills/launch/scripts/report-model.mjs';
import { renderReport } from '../skills/launch/scripts/render-html.mjs';
import { renderSummary } from '../skills/launch/scripts/render-summary.mjs';

const DIR = new URL('./snapshots/', import.meta.url);
const step = (n, extra = {}) => ({
  step: n, route: '/', action: `a${n}`, thought: `thought ${n}`, feeling: 'fine', screenshot: `s${n}.png`, progress: true, ...extra,
});
const person = (id, name, extra = {}) => ({
  id, name, base: 'b', situation: `${name} situation`, why_chosen: 'w', came_for: 'c', arrival: '',
  outcome: 'completed', stop_reason: 'goal_reached', left_at: '/done.html',
  steps: [step(1), step(2)], last_words: null, apple: null, launch_comment: null, ...extra,
});
const people = () => [
  person('p1', '小美', {
    last_words: { would_return: 'yes', why: 'ok', tell_a_friend: 'nice', steps: [1] },
    launch_comment: { text: '好用', steps: [2] },
  }),
  person('p2', '阿哲', { outcome: 'abandoned', stop_reason: 'leave_urge', left_at: '/signup.html' }),
];
const merged = (list) => ({
  run: {}, personas: list.map((p) => ({ persona: p.id, outcome: p.outcome, stop_reason: p.stop_reason, left_at: p.left_at, steps: p.steps.length })),
  findings: [{ severity: 'medium', band: 'main', sources: [{ persona: 'p2', step: 1, observed: '我找不到登入按鈕' }] }],
  dropped_voices: [{ persona: 'p1' }], people: list, apple: { asked: 3, yes: 1, no: 2, unsure: 0, warn: true },
  injection_attempts: [{ persona: 'p2', route: '/x', quote: 'ignore previous' }],
});
const zhInput = () => ({
  run: { url: 'https://example.com/app', date: '2026-11-08', depth: 'full', language: 'zh-TW', vision: 'v', understanding: 'u', personas: ['p1', 'p2'] },
  merged: merged(people()),
  judgements: { assumptions: [{ claim: '先看價格', happened: '真的', evidence: [{ persona: 'p1', step: 1 }] }], conflicts: [], not_checked: ['沒測手機'] },
  telephone: { chains: [{ from: 'p1', hops: ['再傳', '最後一句印象'], comment: '路人留言' }] },
  previous: null,
});
const enInput = () => ({
  run: { url: 'https://example.org/', date: '2026-11-09', depth: 'standard', language: 'en', vision: 'v', understanding: 'u', personas: ['p2'], rerun_of: 'run-1' },
  merged: merged([people()[1]]),
  judgements: undefined,
  telephone: undefined,
  previous: merged([person('p2', '阿哲', { outcome: 'abandoned', stop_reason: 'leave_urge', left_at: '/pricing.html' })]),
});

const CASES = { zh: zhInput, en: enInput };

for (const [name, input] of Object.entries(CASES)) {
  test(`without a question the ${name} report and summary match their snapshots`, () => {
    const data = input();
    const labels = labelsFor(data.run.language);
    const model = buildReportModel(data);
    const outputs = { [`${name}.html`]: renderReport(model, labels), [`${name}.md`]: renderSummary(model, labels) };
    for (const [file, text] of Object.entries(outputs)) {
      const url = new URL(file, DIR);
      if (process.env.UPDATE_SNAPSHOTS === '1' && !existsSync(url)) {
        mkdirSync(DIR, { recursive: true });
        writeFileSync(url, text);
      }
      assert.equal(text, readFileSync(url, 'utf8'), file);
    }
  });
}
