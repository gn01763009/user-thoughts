import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkCommand, childArgs, childEnv, EMPTY_CONFIG, main, NEVER_FLAGS, NEVER_SUBCOMMANDS } from '../skills/launch/scripts/browser.mjs';
import { isMainModule } from '../skills/launch/scripts/is-main.mjs';

const SCRIPT = fileURLToPath(new URL('../skills/launch/scripts/browser.mjs', import.meta.url));
const CWD = '/project';
const SHOT = `${CWD}/.user-thoughts/runs/r1/p1/screens/01.png`;
const URL_OK = 'http://localhost:4173/';
const PREFIX = ['--session', 't'];

const tempDirs = [];
after(() => { for (const d of tempDirs) rmSync(d, { recursive: true, force: true }); });

const check = (args) => checkCommand(args, { cwd: CWD });
const withSession = (args) => [...PREFIX, ...args];

const ALLOWED = [
  ['open', URL_OK], ['open', 'https://example.com/a?b=1'], ['open', 'about:blank'],
  ['click', '@e2'], ['fill', '@e3', 'hello'], ['type', '@e3', 'hello'], ['press', 'Tab'], ['press', 'Control+a'],
  ['select', '@e4', 'a'], ['select', '@e4', 'a', 'b'], ['check', '@e5'], ['uncheck', '@e5'], ['hover', '@e6'],
  ['scroll', 'down'], ['scroll', 'down', '600'], ['scrollintoview', '@e5'],
  ['snapshot'], ['snapshot', '-i'], ['snapshot', '-i', '-c'],
  ['screenshot', SHOT], ['screenshot', '--full', SHOT], ['screenshot', SHOT, '--full'],
  ['get', 'url'], ['get', 'title'], ['get', 'text', 'body'], ['get', 'text', '@e1'],
  ['wait', '1500'], ['wait', '@e3'], ['eval', 'document.title'], ['eval', 'new Date().toISOString()'],
  ['set', 'viewport', '390', '844'], ['set', 'device', 'iPhone 14'],
  ['tab'], ['tab', 'list'], ['tab', 'new'], ['tab', 'new', URL_OK], ['tab', 'close'], ['tab', 'close', 't2'], ['tab', 't2'],
  ['back'], ['forward'], ['reload'], ['close'],
  ['find', 'role', 'button', 'click', '--name', 'Get started'], ['find', 'role', 'button', 'click', '--name', 'Go', '--exact'],
  ['find', 'text', 'Start free', 'click'], ['find', 'label', 'Email', 'fill', 'a@example.com'],
  ['find', 'first', 'li.item', 'click'], ['find', 'nth', '2', '.card', 'hover'],
];

test('every command the skill uses is allowed and passed through unchanged', () => {
  for (const args of ALLOWED) {
    const result = check(withSession(args));
    assert.equal(result.ok, true, `${args.join(' ')}: ${result.reason}`);
    assert.deepEqual(result.args, withSession(args));
  }
});

test('--version alone needs no session and is the only thing that does', () => {
  assert.deepEqual(check(['--version']), { ok: true, args: ['--version'] });
  for (const args of [['open', URL_OK], [], ['--session'], ['--session', ''], ['--version', 'x']]) {
    assert.equal(check(args).ok, false, args.join(' '));
  }
});

test('every never-allowed flag is refused in every position, with or without =value', () => {
  assert.ok(NEVER_FLAGS.has('--executable-path'));
  for (const flag of NEVER_FLAGS) {
    const value = `${flag}=/tmp/x`;
    const shapes = [
      [flag, '/tmp/x', 'open', URL_OK],
      [value, 'open', URL_OK],
      ['open', flag, '/tmp/x', URL_OK],
      ['open', URL_OK, flag, '/tmp/x'],
      ['open', URL_OK, value],
      ['snapshot', '-i', flag, '/tmp/x'],
      ['click', '@e1', flag],
      ['fill', '@e1', 'text', flag, '/tmp/x'],
      ['fill', flag, 'text'],
      ['screenshot', flag, '/tmp/x', SHOT],
      ['find', 'role', 'button', 'click', flag, '/tmp/x'],
      ['find', 'role', 'button', 'click', '--name', flag],
    ];
    for (const args of shapes) assert.equal(check(withSession(args)).ok, false, args.join(' '));
    assert.equal(check([flag, '/tmp/x', '--session', 't', 'open', URL_OK]).ok, false, `${flag} before the session`);
  }
});

test('every never-allowed subcommand is refused, by name', () => {
  assert.ok(NEVER_SUBCOMMANDS.has('plugin'));
  for (const sub of NEVER_SUBCOMMANDS) {
    const result = check(withSession([sub, 'x']));
    assert.equal(result.ok, false, sub);
    assert.match(result.reason, new RegExp(sub));
  }
});

test('subcommands off the list are refused', () => {
  const others = ['chat', 'batch', 'mcp', 'connect', 'record', 'trace', 'profiler', 'network', 'cookies', 'storage',
    'dashboard', 'doctor', 'upgrade', 'pdf', 'session', 'read', 'skills', 'clipboard', 'keyboard', 'mouse', 'diff',
    'constructor', '__proto__', 'toString'];
  for (const sub of others) assert.equal(check(withSession([sub])).ok, false, sub);
});

test('options that are not allowed for that subcommand are refused', () => {
  const refused = [
    ['close', '--all'], ['snapshot', '-s', 'body'], ['snapshot', '--urls'], ['snapshot', '--interactive'],
    ['click', '--new-tab', '@e1'], ['screenshot', '--screenshot-dir', '/tmp', SHOT], ['screenshot', '--annotate', SHOT],
    ['wait', '--download', '/tmp/x'], ['wait', '--fn', 'true'], ['wait', '--load', 'networkidle'],
    ['eval', '-b', 'eA=='], ['eval', '--stdin'], ['tab', 'new', '--label', 'x', URL_OK],
    ['open', '--enable', 'react-devtools', URL_OK], ['press', '--json', 'Tab'], ['get', 'url', '--json'],
    ['open', URL_OK, '--allow-file-access'], ['open', URL_OK, '--args', '--no-sandbox'], ['open', URL_OK, '--namespace', 'x'],
    ['open', URL_OK, '--session', 'other'], ['snapshot', '--session', 'other'],
  ];
  for (const args of refused) assert.equal(check(withSession(args)).ok, false, args.join(' '));
});

test('the session comes first and its name cannot be an option', () => {
  for (const args of [
    ['--session', '--executable-path', 'open', URL_OK],
    ['--session', '-x', 'open', URL_OK],
    ['--session', 'a b', 'open', URL_OK],
    ['--session', 'a/b', 'open', URL_OK],
    ['--session', 't'],
    ['open', URL_OK, '--session', 't'],
  ]) assert.equal(check(args).ok, false, args.join(' '));
  assert.equal(check(['--session', 'ut-20261108-1430-p1', 'open', URL_OK]).ok, true);
});

test('a session name with a dot is refused, and the refusal states the rule', () => {
  for (const session of ['ut-20261108-1454-example.com-p1-novice', 'ut-20261108-1454-127.0.0.1-coordinator']) {
    const result = check(['--session', session, 'open', URL_OK]);
    assert.equal(result.ok, false, session);
    assert.match(result.reason, /only letters, digits, "_" and "-"/);
    assert.doesNotMatch(result.reason, /host/);
    assert.ok(result.reason.includes(session), 'names the rejected session');
  }
});

test('the host-free session names the skill builds are allowed', () => {
  const names = ['ut-clock', 'ut-20261108-1550-p1', 'ut-20261108-1550-2-p1', 'ut-20261108-1550-p8', 'ut-20261108-1550-verify',
    'ut-20261108-1550-2-verify', 'ut-20261108-1550-coordinator', 'ut-20261108-1550-99-coordinator'];
  for (const session of names) assert.equal(check(['--session', session, 'open', URL_OK]).ok, true, session);
});

test('the longest session name the skill builds fits the 103-byte socket limit under a long home folder', () => {
  const longest = 'ut-20261108-1550-99-coordinator';
  const socket = (home) => `${home}/.agent-browser/${longest}.sock`;
  assert.ok(Buffer.byteLength(socket('/home/firstname.lastname')) <= 103);
  assert.ok(Buffer.byteLength(socket(`/home/${'u'.repeat(45)}`)) <= 103, 'a 51-byte home still fits');
});

test('-- does not end option parsing, so it is refused wherever it could hide a flag', () => {
  const refused = [
    ['--', 'open', URL_OK], ['open', '--', URL_OK], ['click', '--', '--executable-path'],
    ['fill', '@e1', '--', '--executable-path', '/tmp/x'], ['fill', '@e1', '--'],
    ['eval', '--'], ['find', 'text', '--', 'click'],
  ];
  for (const args of refused) assert.equal(check(withSession(args)).ok, false, args.join(' '));
});

test('open and tab new take only http, https and about:blank', () => {
  const bad = ['file:///etc/passwd', 'chrome://settings', 'about:config', 'javascript:alert(1)', 'data:text/html,x',
    'localhost:4173', 'view-source:http://x/', 'ftp://x/', 'nonsense', ''];
  for (const url of bad) {
    assert.equal(check(withSession(['open', url])).ok, false, `open ${url}`);
    assert.equal(check(withSession(['tab', 'new', url])).ok, false, `tab new ${url}`);
  }
});

test('a screenshot must be absolute, a png and inside this project\'s run folder', () => {
  const bad = ['screens/01.png', './01.png', '/tmp/01.png', `${CWD}/01.png`, `${CWD}/.user-thoughts/01.png`,
    `${CWD}/.user-thoughts/runs/../../etc/x.png`, `${CWD}/.user-thoughts/runs/r1/01.jpg`, `${CWD}/.user-thoughts/runs/r1/01`,
    `${CWD}/.user-thoughts/runsevil/01.png`, '/other/.user-thoughts/runs/r1/01.png'];
  for (const path of bad) assert.equal(check(withSession(['screenshot', path])).ok, false, path);
  assert.equal(check(withSession(['screenshot'])).ok, false, 'no path');
  assert.equal(check(withSession(['screenshot', SHOT, SHOT])).ok, false, 'two paths');
});

test('get, set, scroll and find accept only their known forms', () => {
  const refused = [
    ['get', 'html', 'body'], ['get', 'attr', '@e1', 'href'], ['get', 'cdp-url'], ['get'], ['get', 'text'], ['get', 'url', 'x'],
    ['set', 'headers', '{}'], ['set', 'credentials', 'a', 'b'], ['set', 'geo', '1', '2'], ['set', 'offline', 'on'],
    ['set', 'viewport', 'wide', '844'], ['set', 'viewport', '390'], ['set', 'device'],
    ['scroll', 'sideways'], ['scroll', 'down', 'far'],
    ['find', 'css', 'x', 'click'], ['find', 'role', 'button', 'delete'], ['find', 'nth', 'two', '.card', 'click'],
    ['find', 'role', 'button', 'click', 'extra'], ['find', 'role'],
    ['click'], ['click', '@e1', '@e2'], ['fill', '@e1'], ['close', 'now'],
  ];
  for (const args of refused) assert.equal(check(withSession(args)).ok, false, args.join(' '));
});

test('an exact option as a value is refused, because the real CLI reads options anywhere on the line', () => {
  const exact = ['--executable-path', '--session', '--args', '--config', '--unknown-later-flag', '-p', '--anything=1'];
  for (const value of exact) {
    for (const args of [['fill', '@e1', value], ['type', '@e1', value], ['eval', value], ['find', 'text', value, 'click']]) {
      const result = check(withSession(args));
      assert.equal(result.ok, false, args.join(' '));
      assert.match(result.reason, /looks like an option|never allowed/);
    }
  }
});

test('text that merely contains an option is data where the command takes free text', () => {
  const data = ['use --executable-path /tmp/x here', '--executable-path /tmp/x', '-5', '- a dash', '--no thanks'];
  for (const value of data) {
    for (const args of [['fill', '@e1', value], ['type', '@e1', value], ['find', 'label', value, 'click'], ['find', 'label', 'Email', 'fill', value]]) {
      const result = check(withSession(args));
      assert.equal(result.ok, true, `${args.join(' ')}: ${result.reason}`);
      assert.deepEqual(result.args, withSession(args));
    }
  }
  assert.equal(check(withSession(['eval', '"--executable-path".length'])).ok, true);
  assert.equal(check(withSession(['find', 'role', 'button', 'click', '--name', '--executable-path now'])).ok, true);
});

test('shell metacharacters stay one literal argument', () => {
  const nasty = '$(touch /tmp/pwn); `id` && rm -rf / | cat > x';
  const result = check(withSession(['fill', '@e1', nasty]));
  assert.equal(result.ok, true);
  assert.equal(result.args.at(-1), nasty);
});

test('agent-browser always gets the empty config shipped with the skill, so user-level settings cannot apply', () => {
  assert.deepEqual(childArgs(['--session', 't', 'close']), ['--config', EMPTY_CONFIG, '--session', 't', 'close']);
  assert.ok(EMPTY_CONFIG.endsWith(join('skills', 'launch', 'assets', 'browser-config.json')));
  assert.deepEqual(JSON.parse(readFileSync(EMPTY_CONFIG, 'utf8')), {});
});

test('--config stays refused from callers, by name', () => {
  assert.ok(NEVER_FLAGS.has('--config'));
  assert.match(check(withSession(['--config', '/tmp/x', 'open', URL_OK])).reason, /--config is never allowed/);
  assert.match(check(withSession(['open', URL_OK, '--config=/tmp/x'])).reason, /--config is never allowed/);
});

test('childEnv removes AGENT_BROWSER_* and keeps everything else, without touching its input', () => {
  const env = { PATH: '/bin', HOME: '/h', AGENT_BROWSER_EXECUTABLE_PATH: '/evil', AGENT_BROWSER_CONFIG: '/c', AGENT_BROWSER_AUTO_CONNECT: '1' };
  const before = JSON.stringify(env);
  assert.deepEqual(childEnv(env), { PATH: '/bin', HOME: '/h' });
  assert.equal(JSON.stringify(env), before);
});

const capture = () => { const o = { out: '', err: '' }; return { o, io: { out: { write: (s) => { o.out += s; } }, err: { write: (s) => { o.err += s; } } } }; };

test('a refused command exits 2 with a clear message and never starts the browser', () => {
  const { o, io } = capture();
  let calls = 0;
  const status = main(withSession(['--executable-path', '/tmp/x', 'open', URL_OK]), io, () => { calls += 1; return { status: 0 }; });
  assert.equal(status, 2);
  assert.equal(calls, 0);
  assert.match(o.err, /refused/);
  assert.match(o.err, /--executable-path/);
});

test('a missing agent-browser prints the install command and exits 3', () => {
  const { o, io } = capture();
  const status = main(['--version'], io, () => ({ error: Object.assign(new Error('spawn agent-browser ENOENT'), { code: 'ENOENT' }) }));
  assert.equal(status, 3);
  assert.match(o.err, /npm install -g agent-browser && agent-browser install/);
});

test('the child exit code passes through, and a signal or spawn failure is an error', () => {
  const { io } = capture();
  assert.equal(main(withSession(['close']), io, () => ({ status: 0 })), 0);
  assert.equal(main(withSession(['close']), io, () => ({ status: 7 })), 7);
  assert.equal(main(withSession(['close']), io, () => ({ status: null, signal: 'SIGKILL' })), 1);
  assert.equal(main(withSession(['close']), io, () => ({ error: new Error('EACCES') })), 1);
});

test('the script still runs when reached through a symlink', () => {
  const dir = mkdtempSync(join(tmpdir(), 'browser-link-'));
  tempDirs.push(dir);
  const link = join(dir, 'browser-link.mjs');
  symlinkSync(SCRIPT, link);
  const result = spawnSync(process.execPath, [link, '--session', 't', '--executable-path', '/tmp/x', 'open', URL_OK], { encoding: 'utf8' });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /refused/);
});

test('isMainModule follows symlinks and is false for anything else', () => {
  const dir = mkdtempSync(join(tmpdir(), 'is-main-'));
  tempDirs.push(dir);
  const link = join(dir, 'link.mjs');
  symlinkSync(SCRIPT, link);
  const url = pathToFileURL(SCRIPT).href;
  assert.equal(isMainModule(url, SCRIPT), true);
  assert.equal(isMainModule(url, link), true);
  assert.equal(isMainModule(url, join(dir, 'missing.mjs')), false);
  assert.equal(isMainModule(url, fileURLToPath(import.meta.url)), false);
  assert.equal(isMainModule(url, undefined), false);
});

function fakeBrowserDir(script) {
  const dir = mkdtempSync(join(tmpdir(), 'browser-stub-'));
  tempDirs.push(dir);
  const file = join(dir, 'agent-browser');
  writeFileSync(file, script);
  chmodSync(file, 0o755);
  return dir;
}

const STUB = `#!/usr/bin/env node
require('node:fs').writeFileSync(process.env.STUB_OUT, JSON.stringify({ argv: process.argv.slice(2), env: process.env }));
process.stdout.write('stub stdout\\n');
process.stderr.write('stub stderr\\n');
process.exit(5);
`;

test('runs the real binary with no shell, literal arguments, a clean environment and its own output and exit code', () => {
  const dir = fakeBrowserDir(STUB);
  const out = join(dir, 'out.json');
  const nasty = '$(touch /tmp/pwn); echo hi';
  const result = spawnSync(process.execPath, [SCRIPT, '--session', 't', 'fill', '@e1', nasty], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}${delimiter}${process.env.PATH}`, STUB_OUT: out, AGENT_BROWSER_EXECUTABLE_PATH: '/evil' },
  });
  assert.equal(result.status, 5);
  assert.equal(result.stdout, 'stub stdout\n');
  assert.equal(result.stderr, 'stub stderr\n');
  const seen = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(seen.argv, ['--config', EMPTY_CONFIG, '--session', 't', 'fill', '@e1', nasty]);
  assert.equal(seen.env.AGENT_BROWSER_EXECUTABLE_PATH, undefined);
  assert.equal(seen.env.STUB_OUT, out);
});

test('the command line refuses before anything runs: exit 2 and the fake browser is never called', () => {
  const dir = fakeBrowserDir(STUB);
  const out = join(dir, 'out.json');
  const result = spawnSync(process.execPath, [SCRIPT, '--session', 't', '--executable-path', '/tmp/x', 'open', URL_OK], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}${delimiter}${process.env.PATH}`, STUB_OUT: out },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /refused/);
  assert.throws(() => readFileSync(out, 'utf8'));
});

test('with no agent-browser on PATH the command line prints the install command and exits 3', () => {
  const empty = mkdtempSync(join(tmpdir(), 'browser-empty-'));
  tempDirs.push(empty);
  const result = spawnSync(process.execPath, [SCRIPT, '--version'], { encoding: 'utf8', env: { ...process.env, PATH: empty } });
  assert.equal(result.status, 3);
  assert.match(result.stderr, /npm install -g agent-browser && agent-browser install/);
});
