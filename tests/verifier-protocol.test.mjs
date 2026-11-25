// The verifier must never have to guess a browser command: every command its protocol names has to pass the
// browser script's own check, and the protocol must say not to ask for --help (a refusal ends the check).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkCommand } from '../skills/launch/scripts/browser.mjs';

const PROTOCOL = readFileSync(new URL('../skills/launch/references/verifier-protocol.md', import.meta.url), 'utf8');
const CWD = '/tmp/project';
const SESSION = ['--session', 'ut-20261126-0000-verify'];
const VALUES = {
  '<url>': 'http://localhost:4173/pricing.html',
  '<width>': '390',
  '<height>': '844',
  '<screenshot>': `${CWD}/.user-thoughts/runs/r/verify-screens/01.png`,
};

const commandLines = () => PROTOCOL.split('\n')
  .map((line) => /^\s*<browser> (.+?)\s*$/.exec(line)?.[1])
  .filter(Boolean);

test('the protocol lists the browser commands it needs', () => {
  const words = commandLines().map((c) => c.split(' ')[0]);
  for (const needed of ['set', 'open', 'wait', 'screenshot', 'get', 'snapshot', 'close']) assert.ok(words.includes(needed), needed);
});

test('every command the protocol names passes the browser script', () => {
  for (const line of commandLines()) {
    const args = line.split(' ').map((part) => VALUES[part] ?? part);
    const result = checkCommand([...SESSION, ...args], { cwd: CWD });
    assert.equal(result.ok, true, `${line}: ${result.reason}`);
  }
});

test('the protocol says not to ask the browser for help', () => {
  assert.match(PROTOCOL, /--help/);
  assert.equal(checkCommand([...SESSION, '--help'], { cwd: CWD }).ok, false);
});
