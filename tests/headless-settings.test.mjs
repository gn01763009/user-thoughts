import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeSettings, UsageError } from '../evals/make-settings.mjs';

const EVALS = join(dirname(fileURLToPath(import.meta.url)), '..', 'evals');
const template = JSON.parse(readFileSync(join(EVALS, 'headless-settings.template.json'), 'utf8'));
const DIR = '/opt/plugin/skills/launch';

const EXPECTED_TEMPLATE_ALLOW = [
  'Bash(node {{SKILL_DIR}}/scripts/browser.mjs *)',
  'Bash(node {{SKILL_DIR}}/scripts/merge-findings.mjs *)',
  'Bash(node {{SKILL_DIR}}/scripts/build-report.mjs *)',
  'Read(/{{SKILL_DIR}}/**)',
];

function keysDeep(value) {
  if (Array.isArray(value)) return value.flatMap(keysDeep);
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, inner]) => [key, ...keysDeep(inner)]);
}

test('template allow is exactly the pinned rules', () => {
  assert.deepEqual([...template.permissions.allow].sort(), [...EXPECTED_TEMPLATE_ALLOW].sort());
});

test('template has no bypass or default-mode keys', () => {
  const bad = keysDeep(template).filter((k) => k === 'defaultMode' || k === 'bypassPermissions' || k.startsWith('dangerously'));
  assert.deepEqual(bad, []);
});

test('node and Read rules have no wildcard in any directory segment', () => {
  for (const rule of template.permissions.allow.filter((r) => /^(node|Read)|^Bash\(node/.test(r))) {
    const path = rule.replace(/^(Bash\(node |Read\()/, '').replace(/\)$/, '').split(' ')[0];
    const segments = path.split('/');
    for (const seg of segments.slice(0, -1)) assert.ok(!seg.includes('*'), `${rule}: ${seg}`);
  }
});

test('makeSettings fills every placeholder and does not mutate the template', () => {
  const before = JSON.stringify(template);
  const out = makeSettings(template, `${DIR}/`);
  assert.equal(JSON.stringify(template), before);
  assert.ok(!JSON.stringify(out).includes('{{'));
  assert.ok(out.permissions.allow.includes(`Bash(node ${DIR}/scripts/merge-findings.mjs *)`));
  assert.ok(out.permissions.allow.includes(`Read(/${DIR}/**)`));
});

test('makeSettings rejects bad skillDir values', () => {
  const bad = ['relative/skills/launch', '/a/*/skills/launch', '/a/b?/skills/launch', '/a(b)/skills/launch',
    '/a\n/skills/launch', '/a/../skills/launch', '/a/skills/other', '/a/skills/launcher', ''];
  for (const dir of bad) assert.throws(() => makeSettings(template, dir), UsageError, dir);
});

test('CLI writes filled settings and exits 2 on a bad dir', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'ms-')), 'settings.json');
  const script = join(EVALS, 'make-settings.mjs');
  assert.equal(spawnSync('node', [script, DIR, out]).status, 0);
  assert.ok(!readFileSync(out, 'utf8').includes('{{'));
  assert.equal(spawnSync('node', [script, 'nope', out]).status, 2);
});
