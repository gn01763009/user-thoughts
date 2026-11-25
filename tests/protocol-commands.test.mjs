// No agent should have to guess a browser command: every command a protocol names has to pass the browser
// script's own check, and each protocol says not to ask for --help (the script refuses it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkCommand } from '../skills/launch/scripts/browser.mjs';

const read = (name) => readFileSync(new URL(`../skills/launch/references/${name}`, import.meta.url), 'utf8');
const CWD = '/tmp/project';
const SESSION = ['--session', 'ut-20261126-0000-p1'];
const VALUES = {
  '<url>': 'http://localhost:4173/pricing.html',
  '<width>': '390',
  '<height>': '844',
  '<screenshot>': `${CWD}/.user-thoughts/runs/r/p1/screens/01.png`,
  '<ref>': '@e3',
  '<text>': 'hello',
  '<key>': 'Tab',
};
const PROTOCOLS = [
  { file: 'verifier-protocol.md', needs: ['set', 'open', 'wait', 'screenshot', 'get', 'snapshot', 'close'] },
  { file: 'persona-protocol.md', needs: ['set', 'open', 'screenshot', 'snapshot', 'click', 'fill', 'press', 'scroll', 'get', 'back', 'close'] },
];

const commandLines = (text) => text.split('\n')
  .map((line) => /^\s*<browser> (.+?)\s*$/.exec(line)?.[1])
  .filter(Boolean);

for (const { file, needs } of PROTOCOLS) {
  const text = read(file);

  test(`${file} lists the browser commands it needs`, () => {
    const words = commandLines(text).map((c) => c.split(' ')[0]);
    for (const needed of needs) assert.ok(words.includes(needed), needed);
  });

  test(`every command ${file} names passes the browser script`, () => {
    const lines = commandLines(text);
    assert.ok(lines.length > 0);
    for (const line of lines) {
      const args = line.split(' ').map((part) => VALUES[part] ?? part);
      const result = checkCommand([...SESSION, ...args], { cwd: CWD });
      assert.equal(result.ok, true, `${line}: ${result.reason}`);
    }
  });

  test(`${file} says not to ask the browser for help`, () => {
    assert.match(text, /Never run `--help`/);
  });
}

test('the browser script refuses --help', () => {
  assert.equal(checkCommand([...SESSION, '--help'], { cwd: CWD }).ok, false);
});
