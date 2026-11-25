// A merged.json written by hand or by an older script can hold entries that are not findings.
// The report skips them instead of failing, in both layouts, and still uses the real ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReportModel } from '../skills/launch/scripts/report-model.mjs';
import { renderReport } from '../skills/launch/scripts/render-html.mjs';
import { labelsFor } from '../skills/launch/scripts/labels.mjs';

const step = { step: 1, route: '/', action: 'a', thought: 'I could not find the menu at all', feeling: 'confused', screenshot: 'p1/s1.png', progress: false };
const person = { id: 'p1', name: 'Dana', situation: 's', why_chosen: 'w', came_for: 'c', outcome: 'abandoned', stop_reason: 'leave_urge', left_at: '/', steps: [step], last_words: null, apple: null, launch_comment: null };
const real = { fingerprint: 'f1', band: 'main', severity: 'high', route: '/', element: { name: 'Menu' }, verification: 'confirmed', sources: [{ persona: 'p1', step: 1, observed: 'no menu' }] };
const unverified = { ...real, fingerprint: 'f2', verification: 'not_reproduced' };
const merged = (findings) => ({ personas: [], dropped_voices: [], people: [person], apple: { asked: 0, yes: 0, no: 0, unsure: 0, warn: false }, findings });
const run = (extra = {}) => ({ url: 'http://localhost:4173/', date: '2026-11-26', depth: 'quick', language: 'en', vision: 'v', understanding: 'u', personas: ['p1'], ...extra });
const JUNK = [null, 5, 'text', []];

test('entries that are not findings are skipped in a report without a question', () => {
  const model = buildReportModel({ run: run(), merged: merged([...JUNK, real, unverified]) });
  assert.ok(model.top_finding.includes('I could not find the menu'));
  assert.equal(model.not_checked.filter((line) => line.includes('Menu')).length, 1);
  assert.doesNotThrow(() => renderReport(model, labelsFor('en')));
});

test('entries that are not findings are skipped when a change is checked', () => {
  const judgements = {
    question: { answer: 'does_not_hold', happened: 'h', breaks: [{ persona: 'p1', step: 1 }] },
    changes: [{ change: 'Show the menu on phones', finding: 'f1', evidence: [{ persona: 'p1', step: 1 }] }],
  };
  const model = buildReportModel({ run: run({ question: 'Can phone visitors find the menu?' }), merged: merged([...JUNK, real]), judgements });
  assert.deepEqual(model.changes.map((c) => c.finding.fingerprint), ['f1']);
});
