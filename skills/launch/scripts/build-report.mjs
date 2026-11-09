#!/usr/bin/env node
// Usage: node build-report.mjs <run dir> [--open]
// Reads run.json and merged.json (required), judgements.json, telephone.json, decisions.md and content.json (optional; warns if unreadable),
// writes report.html and summary.md, prints the summary.
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { isMainModule } from './is-main.mjs';
import { parseDecisions } from './judgements.mjs';
import { buildReportModel } from './report-model.mjs';
import { labelsFor } from './labels.mjs';
import { renderReport } from './render-html.mjs';
import { renderSummary } from './render-summary.mjs';

const USAGE = 'Usage: node build-report.mjs <run dir> [--open]';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function readOptional(path) {
  try {
    return readJson(path);
  } catch {
    return undefined;
  }
}

// A missing file is normal. A file that is there but cannot be read is reported, and the report is still built.
function readCoordinatorFile(dir, file, io, parse = JSON.parse) {
  const path = join(dir, file);
  if (!existsSync(path)) return { value: undefined, unreadable: [] };
  try {
    return { value: parse(readFileSync(path, 'utf8')), unreadable: [] };
  } catch (err) {
    io.err.write(`Warning: ${file} could not be read (${err.message}). The report was built without it.\n`);
    return { value: undefined, unreadable: [file] };
  }
}

function readRequired(dir, file) {
  try {
    return { value: readJson(join(dir, file)) };
  } catch (err) {
    return { error: `Cannot read ${file} in ${dir}: ${err.message}` };
  }
}

// A path that does not exist cannot be followed through a link, so it is compared as written.
function realFolder(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

// A run is never its own previous run: comparing it with itself would claim that nothing changed.
function readPrevious(dir, run) {
  if (typeof run.rerun_of !== 'string' || run.rerun_of === '') return null;
  const base = isAbsolute(run.rerun_of) ? run.rerun_of : resolve(dirname(dir), run.rerun_of);
  if (realFolder(base) === realFolder(dir)) return null;
  return readOptional(join(base, 'merged.json')) ?? null;
}

export function defaultOpener(path) {
  try {
    const [cmd, args] = process.platform === 'darwin' ? ['open', [path]]
      : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', path]]
        : ['xdg-open', [path]];
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
  } catch {
    // The path is printed by the caller; failing to open is not an error.
  }
}

function openReport(path, opener, io) {
  try {
    opener(path);
  } catch {
    io.err.write(`Could not open a browser. Open this file yourself: ${path}\n`);
  }
}

export function main(argv, io = { out: process.stdout, err: process.stderr }, opener = defaultOpener) {
  const shouldOpen = argv.includes('--open');
  const dirs = argv.filter((a) => a !== '--open');
  if (dirs.length !== 1) {
    io.err.write(`${USAGE}\n`);
    return 1;
  }
  const dir = resolve(dirs[0]);
  const run = readRequired(dir, 'run.json');
  const merged = readRequired(dir, 'merged.json');
  const failure = run.error ?? merged.error;
  if (failure) {
    io.err.write(`${failure}\n`);
    return 1;
  }
  const judgements = readCoordinatorFile(dir, 'judgements.json', io);
  const telephone = readCoordinatorFile(dir, 'telephone.json', io);
  const decisions = readCoordinatorFile(dir, 'decisions.md', io, parseDecisions);
  const content = readCoordinatorFile(dir, 'content.json', io);
  const model = buildReportModel({
    run: run.value,
    merged: merged.value,
    judgements: judgements.value,
    telephone: telephone.value,
    previous: readPrevious(dir, run.value),
    decisions: decisions.value ?? [],
    content: content.value,
    unreadable: [...judgements.unreadable, ...telephone.unreadable, ...decisions.unreadable, ...content.unreadable],
  });
  const labels = labelsFor(run.value.language);
  const summary = renderSummary(model, labels);
  const reportPath = join(dir, 'report.html');
  writeFileSync(reportPath, renderReport(model, labels));
  writeFileSync(join(dir, 'summary.md'), summary);
  io.out.write(summary);
  io.out.write(`${reportPath}\n`);
  if (shouldOpen) openReport(reportPath, opener, io);
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
