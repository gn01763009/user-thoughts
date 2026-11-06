#!/usr/bin/env node
// Serves exactly one directory under evals/fixtures/ for a browser run.
// Usage: node evals/serve.mjs <planted|clean|hostile|slop> [port]
import http from 'node:http';
import { readFile, stat, mkdir, appendFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODES = ['planted', 'clean', 'hostile', 'slop'];
const DEFAULT_PORT = 4173;
const DEFAULT_LOG = join(HERE, 'results', 'canary.log');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

export function mimeFor(file) {
  return MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

export function parseServeArgs(argv) {
  const [mode, portText] = argv;
  if (!mode) throw new Error(`usage: node evals/serve.mjs <${MODES.join('|')}> [port]`);
  if (!MODES.includes(mode)) throw new Error(`unknown directory "${mode}", expected ${MODES.join('|')}`);
  const port = portText === undefined ? DEFAULT_PORT : Number(portText);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`invalid port "${portText}"`);
  return { root: join(HERE, 'fixtures', mode), port };
}

// Resolve a URL path to a file inside root, or null when it would escape root.
export function safeResolve(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const target = resolve(root, '.' + decoded);
  const base = resolve(root);
  return target === base || target.startsWith(base + sep) ? target : null;
}

async function pickFile(target) {
  const info = await stat(target).catch(() => null);
  if (!info) return null;
  if (!info.isDirectory()) return target;
  const index = join(target, 'index.html');
  const indexInfo = await stat(index).catch(() => null);
  return indexInfo?.isFile() ? index : null;
}

function cleanSource(raw) {
  const value = (raw ?? '').replace(/[^\w.-]/g, '').slice(0, 40);
  return value || 'unknown';
}

async function recordCanary(logFile, url) {
  const src = cleanSource(url.searchParams.get('src'));
  await mkdir(dirname(logFile), { recursive: true });
  await appendFile(logFile, `${new Date().toISOString()} ${src}\n`);
}

function send(res, status, body = '', headers = {}) {
  res.writeHead(status, { 'cache-control': 'no-store', ...headers });
  res.end(body);
}

function makeHandler({ root, logFile }) {
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', { allow: 'GET, HEAD' });
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname === '/__canary') {
        await recordCanary(logFile, url);
        return send(res, 204);
      }
      const target = safeResolve(root, url.pathname);
      if (!target) return send(res, 403, 'Forbidden');
      const file = await pickFile(target);
      if (!file) return send(res, 404, 'Not found', { 'content-type': 'text/plain; charset=utf-8' });
      const body = await readFile(file);
      return send(res, 200, req.method === 'HEAD' ? '' : body, { 'content-type': mimeFor(file) });
    } catch (err) {
      console.error(`request failed for ${req.url}:`, err);
      return send(res, 500, 'Server error');
    }
  };
}

export function startServer({ root, port = DEFAULT_PORT, logFile = DEFAULT_LOG }) {
  const server = http.createServer(makeHandler({ root, logFile }));
  return new Promise((resolveStart, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolveStart(server));
  });
}

async function main() {
  let args;
  try {
    args = parseServeArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  try {
    const server = await startServer(args);
    console.log(`Serving ${args.root}\nhttp://localhost:${server.address().port}/`);
  } catch (err) {
    console.error(`could not start server: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
