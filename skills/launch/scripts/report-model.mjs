// Pure assembly of the report model from merged.json, gated judgements and telephone chains.
import { labelsFor } from './labels.mjs';
import { gateJudgements, gateTelephone, stepKey } from './judgements.mjs';
import { overviewQuote } from './report-moment.mjs';
import { prettyRoute } from './report-format.mjs';
import { cardProfile } from './stories.mjs';
import { gateContent } from './content-issues.mjs';

export const APPLE_STATUS = 'experimental';

const asArray = (v) => (Array.isArray(v) ? v : []);
const isText = (v) => typeof v === 'string' && v !== '';
const fillText = (template, values) => template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));
const nameOf = (people, id) => people.find((p) => p.id === id)?.name ?? id;

function hostOf(url) {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

function evidenceFor(person, stepNumbers) {
  return asArray(stepNumbers)
    .map((n) => person.steps.find((s) => s.step === n))
    .filter(Boolean)
    .map(({ step, thought, feeling, screenshot }) => ({ persona: person.id, name: person.name, step, thought, feeling, screenshot }));
}

function personComment(person) {
  const c = person.launch_comment;
  if (!c) return [];
  return [{ author: person.name, text: c.text, evidence: evidenceFor(person, c.steps) }];
}

function buildComments(run, people, chains, labels) {
  if (run.depth !== 'full') return [];
  const own = people.flatMap(personComment);
  const bystanders = chains
    .filter((c) => isText(c.comment))
    .map((c) => ({ author: labels.bystander, text: c.comment, evidence: [] }));
  return [...own, ...bystanders];
}

function timelineOf(source, id) {
  const people = asArray(source?.people);
  const personas = asArray(source?.personas);
  const person = people.find((p) => p.id === id);
  const entry = personas.find((p) => p.persona === id);
  if (!person && !entry) return null;
  const pick = (key) => person?.[key] ?? entry?.[key] ?? null;
  const steps = typeof entry?.steps === 'number' ? entry.steps : (person?.steps.length ?? 0);
  return { outcome: pick('outcome'), stop_reason: pick('stop_reason'), left_at: pick('left_at'), steps };
}

function buildRerun(run, merged, previous, labels) {
  if (!isText(run.rerun_of)) return null;
  const id = asArray(run.personas)[0];
  const current = timelineOf(merged, id);
  if (previous == null) return { id, previous: null, current, note: labels.previous_missing };
  const before = timelineOf(previous, id);
  return { id, previous: before, current, note: before ? null : labels.person_missing_in_previous };
}

const MIN_FINDING_CHARS = 8;
const oneLine = (text) => text.replace(/\s+/g, ' ').trim();
const charCount = (text) => Array.from(text).length;

// Who, where and what they thought, in the run's language. A mutter is not a finding: under
// MIN_FINDING_CHARS the person's own line for a friend stands in, and the English record is the last resort.
function topFinding(merged, people, labels, skip) {
  const sources = asArray(merged.findings).filter((f) => f.band === 'main').flatMap((f) => asArray(f.sources));
  const source = sources.find((s) => !skip.has(stepKey(s?.persona, s?.step)));
  const person = people.find((p) => p.id === source?.persona);
  const step = person?.steps?.find((s) => s.step === source?.step);
  const thought = isText(step?.thought) ? oneLine(step.thought) : '';
  const friend = isText(person?.last_words?.tell_a_friend) ? oneLine(person.last_words.tell_a_friend) : '';
  const words = charCount(thought) >= MIN_FINDING_CHARS ? thought : friend;
  if (words !== '') {
    const route = prettyRoute(step.route);
    const where = route === '' ? '' : `${labels.sep_comma}${route}`;
    return `${person.name}${where}${labels.sep_colon}${labels.quote_open}${words}${labels.quote_close}`;
  }
  return isText(source?.observed) ? source.observed : null;
}

// Steps the coordinator marked as caused by the test setup. They stay in the story, flagged.
function markTestLimits(people, testLimits) {
  const marked = new Set(testLimits.flatMap((t) => t.evidence.map((r) => stepKey(r.persona, r.step))));
  return people.map((person) => ({
    ...person,
    steps: person.steps.map((s) => (marked.has(stepKey(person.id, s.step)) ? { ...s, test_limit: true } : s)),
  }));
}

const skippedSteps = (...groups) => new Set(groups.flat().flatMap((g) => g.evidence.map((r) => stepKey(r.persona, r.step))));

// Page content aimed at AI agents: recorded by a person, never obeyed. Shown so the builder sees it.
function injectionAttempts(merged, people) {
  return asArray(merged.injection_attempts).map((a) => ({
    persona: a?.persona ?? null,
    person: nameOf(people, a?.persona ?? null),
    route: a?.route ?? '',
    quote: a?.quote ?? '',
  }));
}

function notReproducedLines(merged, labels) {
  return asArray(merged.findings)
    .filter((finding) => finding.verification === 'not_reproduced')
    .map((finding) => fillText(labels.not_reproduced, { route: prettyRoute(finding.route), name: finding.element?.name ?? '' }));
}

// What this run could not cover: the coordinator's list, then people who did not finish, malformed records,
// findings the verifier could not reproduce and unreadable files.
function notChecked({ judged, merged, people, labels, unreadable, contentDropped = 0 }) {
  const incomplete = asArray(merged.incomplete).map((entry) =>
    fillText(labels.incomplete_person, { name: nameOf(people, entry?.persona ?? ''), reason: entry?.reason ?? '' }));
  const parseErrors = asArray(merged.parse_errors).length;
  const parseLine = parseErrors > 0 ? [fillText(labels.parse_errors_note, { n: parseErrors })] : [];
  const unreadableLines = asArray(unreadable).map((file) => fillText(labels.unreadable_file, { file }));
  const contentLine = contentDropped > 0 ? [fillText(labels.content_dropped, { n: contentDropped })] : [];
  return [...asArray(judged?.not_checked), ...incomplete, ...parseLine, ...notReproducedLines(merged, labels), ...contentLine, ...unreadableLines];
}

function overviewOf(person) {
  const { id, name, situation, came_for, facts, outcome, stop_reason, left_at } = person;
  return {
    id, name, situation, came_for, facts, outcome, stop_reason, left_at,
    would_return: person.last_words?.would_return ?? null,
    pull_quote: overviewQuote(person),
  };
}

export function buildReportModel({ run, merged, judgements, telephone, previous, unreadable, decisions = [], content }, labels = labelsFor(run.language)) {
  const profiled = asArray(merged.people).map((person) => ({ ...person, ...cardProfile(person) }));
  const gatedJudgements = judgements === undefined ? null : gateJudgements(judgements, profiled, decisions);
  const testLimits = asArray(gatedJudgements?.test_limits);
  const decided = asArray(gatedJudgements?.decided);
  const people = markTestLimits(profiled, testLimits);
  const gatedTelephone = telephone === undefined ? null : gateTelephone(telephone, people);
  const chains = asArray(gatedTelephone?.chains);
  const gatedContent = gateContent(content);
  const readerAttempts = gatedContent.injection_attempts.map((a) => ({ ...a, persona: null, person: labels.content_reader }));
  const droppedCount = asArray(merged.dropped_voices).length
    + asArray(gatedJudgements?.dropped).length + asArray(gatedTelephone?.dropped).length;
  return {
    language: run.language,
    url: run.url,
    host: hostOf(run.url),
    date: run.date,
    depth: run.depth,
    vision: run.vision,
    understanding: run.understanding,
    apple: { ...merged.apple, status: APPLE_STATUS },
    injection_attempts: [...injectionAttempts(merged, people), ...readerAttempts],
    overview: people.map(overviewOf),
    people,
    telephone: chains,
    comments: buildComments(run, people, chains, labels),
    assumptions: asArray(gatedJudgements?.assumptions),
    conflicts: asArray(gatedJudgements?.conflicts),
    content_issues: gatedContent.issues,
    real_checks: asArray(gatedJudgements?.real_checks),
    test_limits: testLimits,
    decided,
    not_checked: notChecked({ judged: gatedJudgements, merged, people, labels, unreadable, contentDropped: gatedContent.dropped }),
    top_finding: topFinding(merged, people, labels, skippedSteps(testLimits, decided)),
    rerun: buildRerun(run, merged, previous, labels),
    dropped_count: droppedCount,
  };
}
