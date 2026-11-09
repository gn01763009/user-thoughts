#!/usr/bin/env node
// Merges one launch run directory into merged.json.
// Format and rules: docs/design.md ("Schemas" and "Merge rules").

import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isMainModule } from './is-main.mjs';
import { buildPeople, isSafeRelativePath, peopleProblem, tallyApple } from './stories.mjs';

export const MAX_CONFIDENCE = 10;
export const EVIDENCE_CAP = 4;
export const MAIN_BAND_MIN = 7;
export const TENTATIVE_BAND_MIN = 5;
export const MAX_LEAVE_URGE = 3;
export const MERGED_FILE = 'merged.json';
const FEATURE_VERIFICATION_PREFIX = 'feature:';

const CATEGORIES = ['comprehension', 'findability', 'friction', 'trust', 'value', 'accessibility', 'breakage', 'injection_attempt'];
const IMPACTS = ['stopped_me', 'slowed_me', 'annoyed_me'];
const VERDICTS = ['want', 'neutral', 'dont_want'];
const COSTS = ['covers_content', 'interrupts', 'adds_step', 'asks_data_before_value', 'duplicates_path', 'unverifiable_claim'];
const SUMMARY_STATUSES = ['DONE', 'BLOCKED', 'INCOMPLETE'];
const OUTCOMES = ['completed', 'abandoned', 'blocked'];
export const STOP_REASONS = ['goal_reached', 'step_limit', 'no_progress_limit', 'leave_urge', 'bot_check', 'login_wall', 'unsafe_action', 'error'];
export const FEELINGS = ['delighted', 'fine', 'unsure', 'confused', 'annoyed', 'stuck'];
const WOULD_RETURN = ['yes', 'maybe', 'no'];
const APPLE_ANSWERS = ['yes', 'no', 'unsure'];
const VERIFICATION_STATUSES = ['confirmed', 'not_reproduced', 'unable'];
const REQUIRED_PERSONA_FILES = ['findings.jsonl', 'features.jsonl', 'trace.jsonl'];
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];
const FEATURE_NAME_PATTERN = /[^\p{L}\p{N}]+/gu;
const EDGE_HYPHENS = /^-+|-+$/g;
const TRAILING_SLASHES = /\/+$/;
const TRAILING_HTML = /\.html$/i;
const INJECTION_CATEGORY = 'injection_attempt';
const FINDING_SOURCE_FIELDS = ['persona', 'observed', 'interpretation', 'quote', 'screenshot', 'step', 'impact', 'confidence'];
const FEATURE_SOURCE_FIELDS = ['persona', 'feature', 'verdict', 'my_job', 'costs', 'if_gone', 'quote', 'screenshot', 'step', 'confidence'];
const USAGE = 'Usage: node merge-findings.mjs <run-dir>';

export class RunError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RunError';
  }
}

// ---------- validation helpers ----------

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isString = (value) => typeof value === 'string';
const isBoolean = (value) => typeof value === 'boolean';
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const isConfidence = (value) => Number.isInteger(value) && value >= 1 && value <= MAX_CONFIDENCE;
const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';
const isLeaveUrge = (value) => Number.isInteger(value) && value >= 0 && value <= MAX_LEAVE_URGE;

function oneOf(allowed) {
  const check = (value) => allowed.includes(value);
  check.allowed = allowed;
  return check;
}

function arrayOf(check) {
  return (value) => Array.isArray(value) && value.every(check);
}

const ELEMENT_SCHEMA = (value) => isObject(value) && isString(value.role) && isString(value.name);

const FINDING_SCHEMA = {
  persona: isString,
  category: oneOf(CATEGORIES),
  route: isString,
  element: ELEMENT_SCHEMA,
  observed: isString,
  quote: isString,
  screenshot: isString,
  step: isNonNegativeInteger,
  impact: oneOf(IMPACTS),
  confidence: isConfidence,
};

const FEATURE_SCHEMA = {
  persona: isString,
  feature: isString,
  route: isString,
  verdict: oneOf(VERDICTS),
  my_job: isString,
  costs: arrayOf(oneOf(COSTS)),
};

const TRACE_SCHEMA = {
  step: isNonNegativeInteger,
  thought: isNonEmptyString,
  feeling: oneOf(FEELINGS),
  progress: isBoolean,
  leave_urge: isLeaveUrge,
};

// Optional summary blocks. A malformed block is dropped on its own; the summary stays valid.
const STEP_LIST = arrayOf(isNonNegativeInteger);
const OPTIONAL_SUMMARY_BLOCKS = {
  last_words: { would_return: oneOf(WOULD_RETURN), why: isString, tell_a_friend: isString, steps: STEP_LIST },
  apple: { answer: oneOf(APPLE_ANSWERS), why: isString },
  launch_comment: { text: isString, steps: STEP_LIST },
};

const SUMMARY_SCHEMA = {
  persona: isString,
  status: oneOf(SUMMARY_STATUSES),
  outcome: oneOf(OUTCOMES),
  stop_reason: oneOf(STOP_REASONS),
  left_at: isString,
  steps: isNonNegativeInteger,
  first_impression: isObject,
};

const VERIFICATION_SCHEMA = {
  fingerprint: isString,
  status: oneOf(VERIFICATION_STATUSES),
};

function describeProblem(key, check) {
  return check.allowed ? `"${key}" must be one of ${check.allowed.join(', ')}` : `"${key}" is missing or invalid`;
}

function problemsOf(record, schema) {
  if (!isObject(record)) return ['record is not a JSON object'];
  return Object.entries(schema)
    .filter(([key, check]) => !check(record[key]))
    .map(([key, check]) => describeProblem(key, check));
}

function featureKeyProblems(record) {
  if (record.key !== undefined) {
    return isString(record.key) && record.key !== '' ? [] : ['"key" must be a non-empty string'];
  }
  if (!isString(record.feature) || slugify(record.feature) === '') {
    return ['feature name has no usable slug; set "key"'];
  }
  return [];
}

function validateFeature(record) {
  return [...problemsOf(record, FEATURE_SCHEMA), ...(isObject(record) ? featureKeyProblems(record) : [])];
}

// Returns { record } or { reason }.
export function parseRecord(text, validate) {
  let record;
  try {
    record = JSON.parse(text);
  } catch (error) {
    return { reason: `invalid JSON: ${error.message}` };
  }
  const problems = validate(record);
  return problems.length > 0 ? { reason: problems.join('; ') } : { record };
}

// ---------- pure rules ----------

const CURLY_SINGLE_QUOTES = /[\u2018\u2019\u201A\u201B]/g;
const CURLY_DOUBLE_QUOTES = /[\u201C\u201D\u201E\u201F]/g;

// Trims, collapses whitespace, straightens curly quotes and lowercases.
function normalizeText(value) {
  return String(value).replace(CURLY_SINGLE_QUOTES, "'").replace(CURLY_DOUBLE_QUOTES, '"').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeRoute(route) {
  const path = route.trim().split('?')[0].replace(TRAILING_SLASHES, '').replace(TRAILING_HTML, '');
  return path === '' || path === '/index' ? '/' : path;
}

export function fingerprint(record) {
  const parts = [normalizeRoute(record.route), record.element.role, record.element.name, record.category];
  return parts.map(normalizeText).join('|');
}

export function slugify(text) {
  return normalizeText(text).replace(FEATURE_NAME_PATTERN, '-').replace(EDGE_HYPHENS, '');
}

function distinct(values) {
  return [...new Set(values)];
}

function distinctPersonas(records, filter = () => true) {
  return distinct(records.filter(filter).map((record) => record.persona));
}

export function severityOf(impactRecords) {
  const personasWith = (impact) => distinctPersonas(impactRecords, (record) => record.impact === impact).length;
  const stopped = personasWith('stopped_me');
  if (stopped >= 2) return 'critical';
  if (stopped === 1) return 'high';
  if (personasWith('slowed_me') >= 1 || personasWith('annoyed_me') >= 2) return 'medium';
  return 'low';
}

export function bandOf(confidence) {
  if (confidence >= MAIN_BAND_MIN) return 'main';
  if (confidence >= TENTATIVE_BAND_MIN) return 'tentative';
  return 'appendix';
}

export function featureStatus({ want, dontWant, costedDontWant }) {
  if (want === 0 && (dontWant >= 2 || costedDontWant >= 1)) return 'question_it';
  if (want >= 1 && dontWant >= 1) return 'split';
  if (want >= 1) return 'keep';
  return 'unclear';
}

export function sortFindings(findings) {
  const rank = (severity) => SEVERITY_ORDER.indexOf(severity);
  return [...findings].sort(
    (a, b) =>
      rank(a.severity) - rank(b.severity) ||
      b.confidence - a.confidence ||
      b.personas.length - a.personas.length,
  );
}

export function longestNoProgressRun(trace) {
  let longest = 0;
  let current = 0;
  for (const { progress } of trace) {
    current = progress ? 0 : current + 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

// ---------- evidence gate ----------

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

// Returns a new record. A missing quote, or a screenshot that is missing or unsafe, caps confidence at EVIDENCE_CAP.
// A step absent from the persona's own trace is handled earlier: loadPersona drops that finding.
export function applyEvidenceGate(record, personaDir) {
  const hasQuote = record.quote.trim() !== '';
  const hasShot = isSafeRelativePath(record.screenshot) && isFile(join(personaDir, record.screenshot));
  if (hasQuote && hasShot) return { ...record, evidence_incomplete: false };
  return {
    ...record,
    confidence: Math.min(record.confidence, EVIDENCE_CAP),
    evidence_incomplete: true,
  };
}

// ---------- merge ----------

function mergeGroup(fingerprintValue, group) {
  const first = group[0];
  const personas = distinct(group.map((record) => record.persona));
  const top = Math.max(...group.map((record) => record.confidence));
  const boosted = Math.min(MAX_CONFIDENCE, top + personas.length - 1);
  const allIncomplete = group.every((record) => record.evidence_incomplete);
  const confidence = allIncomplete ? Math.min(boosted, EVIDENCE_CAP) : boosted;
  return {
    fingerprint: fingerprintValue,
    category: first.category,
    route: first.route,
    element: { role: first.element.role, name: first.element.name },
    personas,
    impacts: group.map((record) => ({ persona: record.persona, impact: record.impact })),
    severity: severityOf(group),
    confidence,
    band: bandOf(confidence),
    evidence_incomplete: allIncomplete,
    verification: null,
    sources: group.map((record) => record.source),
  };
}

export function mergeFindings(records) {
  const groups = new Map();
  for (const record of records) {
    const key = fingerprint(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups].map(([key, group]) => mergeGroup(key, group));
}

// verifications: { [fingerprint]: status }. not_reproduced moves the finding to appendix.
export function applyVerification(findings, verifications) {
  return findings.map((finding) => {
    const status = Object.hasOwn(verifications, finding.fingerprint) ? verifications[finding.fingerprint] : null;
    if (status === null) return finding;
    return {
      ...finding,
      verification: status,
      band: status === 'not_reproduced' ? 'appendix' : finding.band,
    };
  });
}

// ---------- features ----------

// Verifier records for features use the fingerprint "feature:<key>".
function applyFeatureVerification(feature, verifications) {
  const id = `${FEATURE_VERIFICATION_PREFIX}${feature.key}`;
  const status = Object.hasOwn(verifications, id) ? verifications[id] : null;
  return {
    ...feature,
    verification: status,
    status: status === 'not_reproduced' ? 'unclear' : feature.status,
  };
}

export function featureKeyOf(record, aliases) {
  const base = record.key ?? slugify(record.feature);
  return Object.hasOwn(aliases, base) ? aliases[base] : base;
}

function buildFeature(key, group, donePersonas) {
  const noticedBy = distinctPersonas(group);
  const counted = group.filter((record) => !record.evidence_incomplete);
  const countOf = (verdict) => distinctPersonas(counted, (record) => record.verdict === verdict).length;
  const want = countOf('want');
  const dontWant = countOf('dont_want');
  const costedDontWant = counted.filter((record) => record.verdict === 'dont_want' && record.costs.length > 0).length;
  return {
    key,
    feature: group[0].feature,
    routes: distinct(group.map((record) => record.route)),
    status: featureStatus({ want, dontWant, costedDontWant }),
    want,
    neutral: countOf('neutral'),
    dont_want: dontWant,
    costs: distinct(counted.flatMap((record) => record.costs)),
    evidence_incomplete: counted.length === 0,
    noticed_by: noticedBy,
    not_noticed_by: donePersonas.filter((persona) => !noticedBy.includes(persona)),
    sources: group.map((record) => record.source),
  };
}

export function buildFeatures(featureRecords, aliases, donePersonas) {
  const groups = new Map();
  for (const record of featureRecords) {
    const key = featureKeyOf(record, aliases);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups].map(([key, group]) => buildFeature(key, group, donePersonas));
}

// ---------- file reading ----------

function readText(path) {
  return readFileSync(path, 'utf8');
}

// Reads a JSONL file. Missing files give []. Bad lines go to errors and are skipped.
function readJsonl(runDir, relFile, validate, errors) {
  const path = join(runDir, relFile);
  if (!existsSync(path)) return [];
  return readText(path)
    .split('\n')
    .flatMap((text, index) => {
      if (text.trim() === '') return [];
      const outcome = parseRecord(text, validate);
      if (outcome.reason !== undefined) {
        errors.push({ file: relFile, line: index + 1, reason: outcome.reason });
        return [];
      }
      return [{ record: outcome.record, file: relFile, line: index + 1 }];
    });
}

function readSummary(runDir, persona, errors) {
  const relFile = `${persona}/summary.json`;
  const path = join(runDir, relFile);
  if (!existsSync(path)) return null;
  const outcome = parseRecord(readText(path), (record) => problemsOf(record, SUMMARY_SCHEMA));
  if (outcome.reason !== undefined) {
    errors.push({ file: relFile, line: null, reason: outcome.reason });
    return null;
  }
  const blocks = {};
  for (const [name, schema] of Object.entries(OPTIONAL_SUMMARY_BLOCKS)) {
    const value = outcome.record[name];
    const problems = value === undefined ? ['absent'] : problemsOf(value, schema);
    if (problems.length > 0 && value !== undefined) errors.push({ file: relFile, line: null, reason: `${name}: ${problems.join('; ')}` });
    blocks[name] = problems.length === 0 ? value : null;
  }
  return { ...outcome.record, ...blocks };
}

function pick(record, fields) {
  return Object.fromEntries(fields.filter((field) => field in record).map((field) => [field, record[field]]));
}

function gateFinding(entry, personaDir) {
  const gated = applyEvidenceGate(entry.record, personaDir);
  return {
    ...gated,
    ...(entry.step_untraced === undefined ? {} : { step_untraced: entry.step_untraced }),
    source: { ...pick(entry.record, FINDING_SOURCE_FIELDS), file: entry.file, line: entry.line },
  };
}

// A feature verdict with no traced step is kept for the record but not counted.
function gateFeature(entry, tracedSteps) {
  return {
    ...entry.record,
    evidence_incomplete: !tracedSteps.has(entry.record.step),
    source: { ...pick(entry.record, FEATURE_SOURCE_FIELDS), file: entry.file, line: entry.line },
  };
}

// A record names its persona, but only the directory it came from is trusted. Page content can steer an agent,
// and a record claiming another persona would otherwise raise severity by faking agreement.
function ownerProblems(record, persona) {
  return record.persona === persona ? [] : [`persona is ${record.persona}, but the file belongs to ${persona}`];
}

function loadPersona(runDir, persona, errors) {
  const personaDir = join(runDir, persona);
  const checkFinding = (r) => [...problemsOf(r, FINDING_SCHEMA), ...ownerProblems(r, persona)];
  const checkFeature = (r) => [...validateFeature(r), ...ownerProblems(r, persona)];
  const findings = readJsonl(runDir, `${persona}/findings.jsonl`, checkFinding, errors);
  const features = readJsonl(runDir, `${persona}/features.jsonl`, checkFeature, errors);
  const trace = readJsonl(runDir, `${persona}/trace.jsonl`, (r) => problemsOf(r, TRACE_SCHEMA), errors);
  const tracedSteps = new Set(trace.map((entry) => entry.record.step));
  // Injection reports are safety records, not visitor voices: they are never dropped for an untraced step.
  const exempt = (entry) => entry.record.category === INJECTION_CATEGORY;
  const survives = (entry) => exempt(entry) || tracedSteps.has(entry.record.step);
  const kept = findings.filter(survives).map((entry) =>
    exempt(entry) ? { ...entry, step_untraced: !tracedSteps.has(entry.record.step) } : entry,
  );
  const dropped = findings
    .filter((entry) => !survives(entry))
    .map((entry) => ({ persona, kind: 'finding', step: entry.record.step, reason: 'step not in trace' }));
  return {
    dropped,
    id: persona,
    summary: readSummary(runDir, persona, errors),
    trace: trace.map((entry) => entry.record),
    findings: kept.map((entry) => gateFinding(entry, personaDir)),
    features: features.map((entry) => gateFeature(entry, tracedSteps)),
    missing: REQUIRED_PERSONA_FILES.filter((name) => !existsSync(join(personaDir, name))),
  };
}

function readAliases(runDir, errors) {
  const path = join(runDir, 'aliases.json');
  if (!existsSync(path)) return {};
  const outcome = parseRecord(readText(path), (value) => {
    if (!isObject(value)) return ['aliases.json must be a JSON object'];
    return Object.values(value).every(isString) ? [] : ['aliases.json values must be strings'];
  });
  if (outcome.reason !== undefined) {
    errors.push({ file: 'aliases.json', line: null, reason: outcome.reason });
    return {};
  }
  return outcome.record;
}

function readVerifications(runDir, errors) {
  const entries = readJsonl(runDir, 'verification.jsonl', (r) => problemsOf(r, VERIFICATION_SCHEMA), errors);
  return Object.fromEntries(entries.map((entry) => [entry.record.fingerprint, entry.record.status]));
}

// ---------- run.json ----------

function isValidLimit(limit) {
  if (!isObject(limit)) return false;
  const value = limit.no_progress_limit;
  return value === undefined || (Number.isInteger(value) && value >= 1);
}

function runProblem(run) {
  if (!isObject(run)) return 'must be a JSON object';
  if (!Array.isArray(run.personas) || !run.personas.every(isString)) return 'personas must be an array of strings';
  const peopleIssue = peopleProblem(run.people);
  if (peopleIssue !== null) return peopleIssue;
  if (run.persona_limits === undefined) return null;
  if (!isObject(run.persona_limits)) return 'persona_limits must be an object';
  const bad = Object.entries(run.persona_limits).find(([, limit]) => !isValidLimit(limit));
  return bad ? `persona_limits.${bad[0]}.no_progress_limit must be a positive integer` : null;
}

export function readRunJson(runDir) {
  if (!existsSync(runDir) || !statSync(runDir).isDirectory()) {
    throw new RunError(`run directory not found: ${runDir}`);
  }
  let text;
  try {
    text = readText(join(runDir, 'run.json'));
  } catch (error) {
    throw new RunError(`cannot read run.json in ${runDir}: ${error.message}`);
  }
  let run;
  try {
    run = JSON.parse(text);
  } catch (error) {
    throw new RunError(`run.json is not valid JSON: ${error.message}`);
  }
  const problem = runProblem(run);
  if (problem !== null) throw new RunError(`run.json: ${problem}`);
  return run;
}

// ---------- assembly ----------

function incompleteReasons(persona) {
  const reasons = [];
  if (persona.summary === null) reasons.push('no valid summary.json');
  else if (persona.summary.status !== 'DONE') reasons.push(`status ${persona.summary.status}`);
  for (const name of persona.missing) reasons.push(`missing ${name}`);
  return reasons;
}

function personaEntry(persona, limits) {
  const {
    status = null,
    outcome = null,
    stop_reason: stopReason = null,
    left_at: leftAt = null,
    steps = 0,
    came_for: cameFor = null,
    first_impression: firstImpression = {},
  } = persona.summary ?? {};
  const limit = limits[persona.id]?.no_progress_limit;
  const overran = limit !== undefined && longestNoProgressRun(persona.trace) > limit;
  return {
    persona: persona.id,
    status,
    outcome,
    stop_reason: stopReason,
    left_at: leftAt,
    steps,
    came_for: cameFor,
    first_impression: firstImpression,
    overran_give_up: overran,
  };
}

function countsOf(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, appendix: 0 };
  for (const finding of findings) {
    counts[finding.severity] += 1;
    if (finding.band === 'appendix') counts.appendix += 1;
  }
  return counts;
}

function injectionEntry(record) {
  return {
    ...record.source,
    category: record.category,
    route: record.route,
    element: record.element,
    step_untraced: record.step_untraced === true,
  };
}

function runSection(run) {
  return {
    url: run.url,
    date: run.date,
    browser_mode: run.browser_mode,
    personas: run.personas,
  };
}

export function buildMerged(runDir) {
  const run = readRunJson(runDir);
  const errors = [];
  const aliases = readAliases(runDir, errors);
  const verifications = readVerifications(runDir, errors);
  const personas = run.personas.map((id) => loadPersona(runDir, id, errors));
  const donePersonas = personas.filter((p) => p.summary?.status === 'DONE').map((p) => p.id);
  const allFindings = personas.flatMap((p) => p.findings);
  const isInjection = (record) => record.category === INJECTION_CATEGORY;
  const findings = sortFindings(
    applyVerification(mergeFindings(allFindings.filter((r) => !isInjection(r))), verifications),
  );
  const injectionAttempts = allFindings.filter(isInjection).map(injectionEntry);
  const features = buildFeatures(personas.flatMap((p) => p.features), aliases, donePersonas).map((feature) =>
    applyFeatureVerification(feature, verifications),
  );
  const incomplete = personas.flatMap((persona) => {
    const reasons = incompleteReasons(persona);
    return reasons.length > 0 ? [{ persona: persona.id, reason: reasons.join('; ') }] : [];
  });
  const stories = buildPeople(run.people ?? [], personas, runDir);
  return {
    run: runSection(run),
    people: stories.people,
    apple: tallyApple(stories.people),
    personas: personas.map((persona) => personaEntry(persona, run.persona_limits ?? {})),
    findings,
    injection_attempts: injectionAttempts,
    dropped_voices: [...personas.flatMap((p) => p.dropped), ...stories.dropped],
    features,
    incomplete,
    counts: countsOf(findings),
    parse_errors: errors,
  };
}

// ---------- CLI ----------

function formatParseError(error) {
  const location = error.line === null ? error.file : `${error.file} line ${error.line}`;
  return `parse error: ${location}: ${error.reason}\n`;
}

function summaryText(mergedPath, merged) {
  const { critical, high, medium, low, appendix } = merged.counts;
  const questionIt = merged.features.filter((feature) => feature.status === 'question_it').length;
  return [
    `Wrote ${mergedPath}`,
    `Findings by severity: critical ${critical}, high ${high}, medium ${medium}, low ${low} (appendix ${appendix})`,
    `Features: ${merged.features.length} (question_it: ${questionIt})`,
    `Incomplete personas: ${merged.incomplete.length}`,
    `Parse errors: ${merged.parse_errors.length}`,
    `Bad-idea check: ${merged.apple.yes}/${merged.apple.asked} said yes${merged.apple.warn ? ', WARNING: may be flattering you' : ''}`,
    '',
  ].join('\n');
}

export function main(argv, io = { out: process.stdout, err: process.stderr }) {
  const [runArg] = argv;
  if (!runArg) {
    io.err.write(`${USAGE}\n`);
    return 1;
  }
  const runDir = resolve(runArg);
  let merged;
  try {
    merged = buildMerged(runDir);
  } catch (error) {
    if (!(error instanceof RunError)) throw error;
    io.err.write(`merge-findings: ${error.message}\n`);
    return 1;
  }
  const mergedPath = join(runDir, MERGED_FILE);
  writeFileSync(mergedPath, `${JSON.stringify(merged, null, 2)}\n`);
  for (const error of merged.parse_errors) io.err.write(formatParseError(error));
  io.out.write(summaryText(mergedPath, merged));
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
