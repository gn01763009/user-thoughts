#!/usr/bin/env node
// The only way agents touch the browser: node browser.mjs --session <name> <subcommand> [args...]
// It allows the subcommands and options this skill uses, then runs the real agent-browser with no shell.
// agent-browser reads its own options anywhere on the line, even after `--` and where a text value belongs,
// so a token shaped like an option is refused even in a free-text position.
import { spawnSync } from 'node:child_process';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainModule } from './is-main.mjs';

const EXIT_REFUSED = 2;
const EXIT_MISSING = 3;
const INSTALL_COMMAND = 'npm install -g agent-browser && agent-browser install';
const VERSION_FLAG = '--version';
const SESSION_FLAG = '--session';
const SESSION_NAME = /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u;
const OPTION_SHAPED = /^-{1,2}[A-Za-z][\w-]*(=[\s\S]*)?$/;
const WEB_PROTOCOLS = ['http:', 'https:'];
const BLANK_PAGE = 'about:blank';
const SCROLL_DIRECTIONS = ['up', 'down', 'left', 'right'];
const DIGITS = /^\d+$/;
const TAB_REF = /^[A-Za-z0-9][\w-]*$/;
const FIND_LOCATORS = ['role', 'text', 'label', 'placeholder', 'alt', 'title', 'testid', 'first', 'last', 'nth'];
const FIND_ACTIONS = ['click', 'fill', 'check', 'hover', 'text'];

// Refused by name even if a later edit adds them to a subcommand's list.
export const NEVER_FLAGS = new Set(['--executable-path', '--extension', '--init-script', '--profile', '--state',
  '--auto-connect', '--cdp', '--provider', '-p', '--proxy', '--headers', '--config']);
export const NEVER_SUBCOMMANDS = new Set(['plugin', 'auth', 'upload', 'download', 'install', 'profiles', 'state']);

function urlProblem(url) {
  if (url === BLANK_PAGE) return null;
  let protocol;
  try {
    ({ protocol } = new URL(url));
  } catch {
    return `"${url}" is not a full URL`;
  }
  return WEB_PROTOCOLS.includes(protocol) ? null : `only http and https URLs are allowed, not ${protocol}`;
}

function screenshotProblem([path], { cwd }) {
  if (!isAbsolute(path)) return 'the screenshot path must be absolute';
  if (!path.endsWith('.png')) return 'the screenshot path must end in .png';
  const runs = `${join(cwd, '.user-thoughts', 'runs')}${sep}`;
  return resolve(path).startsWith(runs) ? null : `the screenshot path must be inside ${runs}`;
}

function getProblem([what, ...rest]) {
  if ((what === 'url' || what === 'title') && rest.length === 0) return null;
  if (what === 'text' && rest.length === 1) return null;
  return 'get takes only: url, title, text <selector>';
}

function setProblem([setting, ...rest]) {
  if (setting === 'viewport' && rest.length >= 2 && rest.length <= 3 && rest.every((n) => DIGITS.test(n))) return null;
  if (setting === 'device' && rest.length === 1) return null;
  return 'set takes only: viewport <width> <height>, device <name>';
}

function scrollProblem([direction, pixels]) {
  if (!SCROLL_DIRECTIONS.includes(direction)) return `scroll direction must be one of ${SCROLL_DIRECTIONS.join(', ')}`;
  return pixels === undefined || DIGITS.test(pixels) ? null : 'scroll distance must be a number';
}

function tabProblem([first, second]) {
  if (first === undefined || (first === 'list' && second === undefined)) return null;
  if (first === 'new') return second === undefined ? null : urlProblem(second);
  if (first === 'close') return second === undefined || TAB_REF.test(second) ? null : `"${second}" is not a tab`;
  return second === undefined && TAB_REF.test(first) ? null : 'tab takes only: list, new [url], close [tab], <tab>';
}

const findActionIndex = ([locator]) => (locator === 'nth' ? 3 : 2);

function findProblem(positionals) {
  const [locator] = positionals;
  if (!FIND_LOCATORS.includes(locator)) return `find cannot locate by "${locator}"`;
  if (locator === 'nth' && !DIGITS.test(positionals[1] ?? '')) return 'find nth needs a number';
  const actionIndex = findActionIndex(positionals);
  if (positionals.length < actionIndex) return 'find needs something to look for';
  const action = positionals[actionIndex];
  if (action === undefined) return null;
  if (!FIND_ACTIONS.includes(action)) return `find cannot "${action}"`;
  const hasText = positionals.length > actionIndex + 1;
  if (positionals.length > actionIndex + 2) return 'find got too many arguments';
  return (action === 'fill') === hasText ? null : 'find takes text only with fill, and fill needs text';
}

const textAt = (index) => (position) => position === index;
const COMMANDS = Object.freeze({
  open: { min: 1, max: 1, check: ([url]) => urlProblem(url) },
  click: { min: 1, max: 1 },
  fill: { min: 2, max: 2, isData: textAt(1) },
  type: { min: 2, max: 2, isData: textAt(1) },
  press: { min: 1, max: 1 },
  select: { min: 2, max: 8 },
  check: { min: 1, max: 1 },
  uncheck: { min: 1, max: 1 },
  hover: { min: 1, max: 1 },
  scroll: { min: 1, max: 2, check: scrollProblem },
  scrollintoview: { min: 1, max: 1 },
  snapshot: { min: 0, max: 0, flags: ['-i', '-c'] },
  screenshot: { min: 1, max: 1, flags: ['--full'], check: screenshotProblem },
  get: { min: 1, max: 2, check: getProblem },
  wait: { min: 1, max: 1 },
  eval: { min: 1, max: 1, isData: textAt(0) },
  set: { min: 2, max: 4, check: setProblem },
  tab: { min: 0, max: 2, check: tabProblem },
  back: { min: 0, max: 0 },
  forward: { min: 0, max: 0 },
  reload: { min: 0, max: 0 },
  close: { min: 0, max: 0 },
  find: {
    min: 2,
    max: 5,
    flags: ['--exact'],
    valueFlags: ['--name'],
    isData: (position, positionals) => position > 0 && position !== findActionIndex(positionals),
    check: findProblem,
  },
});

const optionName = (arg) => (arg.startsWith('-') ? arg.split('=')[0] : arg);
const neverProblem = (arg) => (NEVER_FLAGS.has(optionName(arg)) ? `${optionName(arg)} is never allowed` : null);

function dataProblem(arg) {
  if (arg !== '--' && !OPTION_SHAPED.test(arg)) return null;
  return `"${arg}" looks like an option, and agent-browser reads options anywhere on the line, so it cannot be passed as text`;
}

function argumentProblem(subcommand, spec, arg, positionals) {
  if (spec.isData?.(positionals.length, positionals)) return dataProblem(arg);
  return arg.startsWith('-') ? `${arg} is not allowed for ${subcommand}` : null;
}

function readArguments(subcommand, spec, rest) {
  const positionals = [];
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const never = neverProblem(arg);
    if (never) return { problem: never };
    if (spec.flags?.includes(arg)) continue;
    if (spec.valueFlags?.includes(arg)) {
      index += 1;
      const value = rest[index];
      const problem = value === undefined ? `${arg} needs a value` : dataProblem(value);
      if (problem) return { problem };
      continue;
    }
    const problem = argumentProblem(subcommand, spec, arg, positionals);
    if (problem) return { problem };
    positionals.push(arg);
  }
  return { positionals };
}

function subcommandProblem(subcommand) {
  if (subcommand === undefined) return 'no subcommand given';
  const never = neverProblem(subcommand);
  if (never) return never;
  if (NEVER_SUBCOMMANDS.has(subcommand)) return `${subcommand} is never allowed`;
  if (Object.hasOwn(COMMANDS, subcommand)) return null;
  return `"${subcommand}" is not allowed. Allowed: ${Object.keys(COMMANDS).join(', ')}`;
}

function commandProblem(subcommand, rest, context) {
  const spec = COMMANDS[subcommand];
  const { problem, positionals } = readArguments(subcommand, spec, rest);
  if (problem) return problem;
  if (positionals.length < spec.min || positionals.length > spec.max) return `wrong number of arguments for ${subcommand}`;
  return spec.check?.(positionals, context) ?? null;
}

function sessionProblem(session) {
  if (SESSION_NAME.test(session ?? '')) return null;
  return `session name "${session ?? ''}" may use only letters, digits, "_" and "-", and must start with a letter or digit`;
}

// Pure: returns { ok: true, args } with the arguments for agent-browser, or { ok: false, reason }.
export function checkCommand(argv, context) {
  if (argv.length === 1 && argv[0] === VERSION_FLAG) return { ok: true, args: [VERSION_FLAG] };
  const [flag, session, subcommand, ...rest] = argv;
  if (flag !== SESSION_FLAG) {
    const never = flag === undefined ? null : neverProblem(flag);
    return { ok: false, reason: never ?? `start with ${SESSION_FLAG} <name>` };
  }
  const problem = sessionProblem(session) ?? subcommandProblem(subcommand) ?? commandProblem(subcommand, rest, context);
  return problem === null ? { ok: true, args: argv } : { ok: false, reason: problem };
}

export function childEnv(env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith('AGENT_BROWSER_')));
}

export const EMPTY_CONFIG = fileURLToPath(new URL('../assets/browser-config.json', import.meta.url));
// An explicit --config replaces default discovery, so ~/.agent-browser/config.json cannot attach a real profile
// and a project's agent-browser.json does not apply either.
export const childArgs = (args, config = EMPTY_CONFIG) => ['--config', config, ...args];

const runAgentBrowser = (args) => spawnSync('agent-browser', childArgs(args), { stdio: 'inherit', env: childEnv(process.env) });

export function main(argv, io = { err: process.stderr }, run = runAgentBrowser) {
  const checked = checkCommand(argv, { cwd: process.cwd() });
  if (!checked.ok) {
    io.err.write(`browser.mjs: refused: ${checked.reason}\n`);
    return EXIT_REFUSED;
  }
  const result = run(checked.args);
  if (result.error?.code === 'ENOENT') {
    io.err.write(`browser.mjs: agent-browser is not installed. Install it with:\n${INSTALL_COMMAND}\n`);
    return EXIT_MISSING;
  }
  if (result.error) {
    io.err.write(`browser.mjs: could not run agent-browser: ${result.error.message}\n`);
    return 1;
  }
  return result.status ?? 1;
}

if (isMainModule(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
