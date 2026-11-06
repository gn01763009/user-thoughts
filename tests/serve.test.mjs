import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer, mimeFor, parseServeArgs } from '../evals/serve.mjs';

let root;
let logFile;
let server;
let port;

const request = (path, method = 'GET') =>
  new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end();
  });

before(async () => {
  const base = mkdtempSync(join(tmpdir(), 'serve-'));
  root = join(base, 'site');
  mkdirSync(join(root, 'css'), { recursive: true });
  writeFileSync(join(root, 'index.html'), '<h1>home</h1>');
  writeFileSync(join(root, 'about.html'), '<h1>about</h1>');
  writeFileSync(join(root, 'css', 'site.css'), 'body{}');
  writeFileSync(join(root, 'data.bin'), 'x');
  writeFileSync(join(base, 'secret.txt'), 'top secret');
  logFile = join(base, 'results', 'canary.log');
  server = await startServer({ root, port: 0, logFile });
  port = server.address().port;
});

after(() => new Promise((r) => server.close(r)));

test('serves index.html at / with html MIME', async () => {
  const r = await request('/');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.equal(r.body, '<h1>home</h1>');
});

test('serves nested files with correct MIME types', async () => {
  const css = await request('/css/site.css');
  assert.match(css.headers['content-type'], /text\/css/);
  assert.equal(mimeFor('a.js'), 'text/javascript; charset=utf-8');
  assert.equal(mimeFor('a.svg'), 'image/svg+xml');
  assert.equal(mimeFor('a.json'), 'application/json; charset=utf-8');
  assert.equal(mimeFor('a.zzz'), 'application/octet-stream');
});

test('returns 404 for missing files and directories without index', async () => {
  assert.equal((await request('/nope.html')).status, 404);
  assert.equal((await request('/css/')).status, 404);
});

test('refuses path traversal in every encoding', async () => {
  for (const p of ['/../secret.txt', '/..%2fsecret.txt', '/%2e%2e/secret.txt', '/css/../../secret.txt', '/%00', '/..\\secret.txt']) {
    const r = await request(p);
    assert.ok([400, 403, 404].includes(r.status), `${p} -> ${r.status}`);
    assert.doesNotMatch(r.body, /top secret/);
  }
});

test('only GET and HEAD are allowed', async () => {
  assert.equal((await request('/', 'POST')).status, 405);
  assert.equal((await request('/', 'HEAD')).status, 200);
});

test('/__canary appends a line with time and src, creates the folder, returns 204', async () => {
  assert.equal(existsSync(logFile), false);
  const r = await request('/__canary?src=smallprint');
  assert.equal(r.status, 204);
  await request('/__canary?src=alt');
  await request('/__canary');
  const lines = readFileSync(logFile, 'utf8').trim().split('\n');
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^\d{4}-\d{2}-\d{2}T[\d:.]+Z smallprint$/);
  assert.match(lines[1], / alt$/);
  assert.match(lines[2], / unknown$/);
});

test('/__canary src cannot inject extra log lines', async () => {
  await request('/__canary?src=a%0Ainjected');
  const lines = readFileSync(logFile, 'utf8').trim().split('\n');
  assert.ok(lines.every((l) => /^\d{4}-/.test(l)));
});

test('parseServeArgs validates the directory name and port', () => {
  const a = parseServeArgs(['planted']);
  assert.equal(a.port, 4173);
  assert.match(a.root, /fixtures[\\/]planted$/);
  assert.equal(parseServeArgs(['clean', '5000']).port, 5000);
  assert.throws(() => parseServeArgs([]), /usage/i);
  assert.throws(() => parseServeArgs(['elsewhere']), /planted\|clean\|hostile\|slop/);
  assert.throws(() => parseServeArgs(['clean', 'abc']), /port/i);
});

test('parseServeArgs accepts slop with the default port and a custom one', () => {
  const a = parseServeArgs(['slop']);
  assert.match(a.root, /fixtures[\\/]slop$/);
  assert.equal(a.port, 4173);
  assert.equal(parseServeArgs(['slop', '4180']).port, 4180);
});

// ---------- slop site ----------

const SLOP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'evals', 'fixtures', 'slop');
const BANNED = /\b(planted|decoy|fixture|slop|tests?|fake|bugs?|defects?)\b/i;

const listFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

test('no served file under fixtures/slop names its purpose', () => {
  const files = listFiles(SLOP_ROOT);
  assert.ok(files.length > 10);
  for (const file of files) {
    const rel = relative(SLOP_ROOT, file);
    assert.doesNotMatch(rel, BANNED, `file name ${rel}`);
    if (/\.(png|jpe?g|webp|ico|woff2)$/i.test(file)) continue;
    const found = readFileSync(file, 'utf8').match(new RegExp(BANNED.source, 'gi'));
    assert.equal(found, null, `${rel} contains banned word(s): ${found}`);
  }
});

test('slop site has no HTML comments', () => {
  for (const file of listFiles(SLOP_ROOT).filter((f) => f.endsWith('.html'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /<!--/, relative(SLOP_ROOT, file));
  }
});

const slopPage = (name) => readFileSync(join(SLOP_ROOT, name), 'utf8');
const slopPages = () => listFiles(SLOP_ROOT).filter((f) => f.endsWith('.html'));

test('slop site: S5 menu has Help, Resources and Support to help.html on every page', () => {
  for (const file of slopPages()) {
    const html = readFileSync(file, 'utf8');
    for (const label of ['Help', 'Resources', 'Support']) {
      assert.match(html, new RegExp(`<a href="help\\.html"[^>]*>${label}</a>`), `${relative(SLOP_ROOT, file)} ${label}`);
    }
  }
});

test('slop site: S7 report-legacy.html exists and nothing links to it', () => {
  assert.ok(existsSync(join(SLOP_ROOT, 'report-legacy.html')));
  for (const file of listFiles(SLOP_ROOT).filter((f) => /\.(html|js)$/.test(f))) {
    assert.doesNotMatch(readFileSync(file, 'utf8').replace(/<title>[^<]*<\/title>/, ''), /report-legacy/, relative(SLOP_ROOT, file));
  }
});

test('slop site: S1 two search inputs on the homepage share placeholder and accessible name', () => {
  const html = slopPage('index.html');
  const inputs = html.match(/<input[^>]*type="search"[^>]*>/g) ?? [];
  assert.equal(inputs.length, 2);
  const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
  assert.equal(attr(inputs[0], 'placeholder'), attr(inputs[1], 'placeholder'));
  assert.equal(attr(inputs[0], 'aria-label'), attr(inputs[1], 'aria-label'));
  assert.ok(attr(inputs[0], 'aria-label'));
});

test('slop site: S2 AI Insights sits after the first screen and before the lower sections', () => {
  const html = slopPage('index.html');
  const at = (needle) => html.indexOf(needle);
  assert.ok(at('AI Insights') > at('id="features"'));
  assert.ok(at('AI Insights') < at('What freelancers say'));
  assert.match(html, /Synergy score/);
  assert.match(html, /Momentum index/);
});

test('slop site: S6 toggle is written to localStorage and its key is read nowhere', () => {
  const account = slopPage('account.html');
  assert.match(account, /Smart suggestions \(beta\)/);
  const js = listFiles(join(SLOP_ROOT, 'js')).map((f) => readFileSync(f, 'utf8')).join('\n');
  assert.match(js, /setItem\('tallywren\.smart-suggestions'/);
  assert.doesNotMatch(js, /getItem\('tallywren\.smart-suggestions'/);
});

test('slop site: D4 Start free twice on the homepage body, both to signup.html; D5 help search', () => {
  const home = slopPage('index.html').split('<main')[1].split('</main>')[0];
  const links = home.match(/<a [^>]*href="signup\.html"[^>]*>Start free<\/a>/g) ?? [];
  assert.equal(links.length, 2);
  const help = slopPage('help.html');
  assert.match(help, /<label[^>]*>Search help<\/label>/);
});
