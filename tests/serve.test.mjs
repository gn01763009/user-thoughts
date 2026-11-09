import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { readdirSync } from 'node:fs';
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
  assert.throws(() => parseServeArgs(['elsewhere']), /planted\|clean\|hostile/);
  assert.throws(() => parseServeArgs(['clean', 'abc']), /port/i);
});

test('parseServeArgs accepts heldout with the shared default port and a custom one', () => {
  const a = parseServeArgs(['heldout']);
  assert.match(a.root, /fixtures[\\/]heldout$/);
  assert.equal(a.port, 4173);
  assert.equal(parseServeArgs(['heldout', '4176']).port, 4176);
  assert.throws(() => parseServeArgs(['elsewhere']), /planted\|clean\|hostile\|heldout/);
});

test('the heldout directory serves its home page, scripts and styles', async () => {
  const { root: heldoutRoot } = parseServeArgs(['heldout']);
  const heldout = await startServer({ root: heldoutRoot, port: 0, logFile });
  const get = (path) =>
    new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port: heldout.address().port, path }, (res) => {
        res.resume();
        res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] }));
      }).on('error', reject);
    });
  try {
    const home = await get('/');
    assert.equal(home.status, 200);
    assert.match(home.type, /text\/html/);
    assert.match((await get('/css/site.css')).type, /text\/css/);
    assert.match((await get('/js/session.js')).type, /text\/javascript/);
    assert.notEqual((await get('/../ground-truth/heldout.json')).status, 200);
  } finally {
    await new Promise((r) => heldout.close(r));
  }
});


// ---------- planted site: promise problems ----------

const PLANTED_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'evals', 'fixtures', 'planted');
const plantedPage = (name) => readFileSync(join(PLANTED_ROOT, name), 'utf8');
const plantedPages = () => readdirSync(PLANTED_ROOT).filter((f) => f.endsWith('.html'));
const navOf = (html) => html.match(/<nav[\s\S]*?<\/nav>/)[0];

test('planted site: P1 header and homepage search share placeholder and accessible name', () => {
  const html = plantedPage('index.html');
  const inputs = [...html.matchAll(/<input[^>]*type="search"[^>]*>/g)].map((m) => m[0]);
  assert.equal(inputs.length, 2);
  const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
  assert.equal(attr(inputs[0], 'placeholder'), attr(inputs[1], 'placeholder'));
  assert.equal(attr(inputs[0], 'aria-label'), attr(inputs[1], 'aria-label'));
  assert.ok(attr(inputs[0], 'aria-label'));
});

test('planted site: P2 Help, Resources and Support all link to help.html on every page', () => {
  for (const file of plantedPages()) {
    const nav = navOf(plantedPage(file));
    for (const label of ['Help', 'Resources', 'Support']) {
      assert.match(nav, new RegExp(`<a href="help\\.html"[^>]*>${label}</a>`), `${file} ${label}`);
    }
  }
});

test('planted site: U2 main menu still has no Pricing link', () => {
  for (const file of plantedPages()) {
    assert.doesNotMatch(navOf(plantedPage(file)), /href="pricing\.html"/, file);
  }
});
