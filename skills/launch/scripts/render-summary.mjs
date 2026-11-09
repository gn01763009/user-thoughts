// summary.md: 6 to 8 plain lines. No score. Pure function.
import { hasStarted, prettyRoute } from './report-format.mjs';

const MAX_CHARS = 120;
const REPORT_PATH = 'report.html';

const oneLine = (text) => String(text).replace(/\s+/g, ' ').trim();

function truncate(text) {
  const chars = Array.from(oneLine(text));
  return chars.length > MAX_CHARS ? `${chars.slice(0, MAX_CHARS).join('')}…` : chars.join('');
}

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? 0));

function titleLine(model, labels) {
  const depth = labels[`depth_${model.depth}`] ?? model.depth;
  return `# ${labels.summary_title}${labels.sep_colon}${model.host}${labels.paren_open}${depth}${labels.paren_close}`;
}

function peopleLine(model, labels) {
  const done = model.overview.filter((p) => p.outcome === 'completed');
  const gaveUp = model.overview.filter((p) => p.outcome === 'abandoned');
  const blocked = model.overview.filter((p) => p.outcome === 'blocked');
  const where = (p) => `${p.name} @ ${prettyRoute(p.left_at) || labels.placeholder}`;
  const parts = [`${labels.summary_completed} ${done.length}/${model.overview.filter(hasStarted).length}`];
  if (gaveUp.length) parts.push(`${labels.gave_up_at}${labels.sep_colon}${gaveUp.map(where).join(labels.sep_list)}`);
  if (blocked.length) parts.push(`${labels.blocked}${labels.sep_colon}${blocked.map(where).join(labels.sep_list)}`);
  return parts.join(labels.sep_clause);
}

function appleLine(model, labels) {
  const verdict = model.apple.warn ? labels.apple_warning : labels.apple_ok;
  const tag = labels[`apple_${model.apple.status}`] ?? model.apple.status;
  return `${labels.apple_title}${labels.paren_open}${tag}${labels.paren_close}${labels.sep_colon}${fill(labels.apple_summary, model.apple)}${labels.sep_sentence}${verdict}`;
}

function wordOfMouthLine(model, labels) {
  const last = model.telephone[0]?.hops?.[2];
  return `${labels.word_of_mouth}${labels.sep_colon}${last ? truncate(last) : labels.placeholder}`;
}

function findingLine(model, labels) {
  return model.top_finding ? [`${labels.top_finding}${labels.sep_colon}${truncate(model.top_finding)}`] : [];
}

function injectionLine(model, labels) {
  const n = model.injection_attempts?.length ?? 0;
  return n > 0 ? [fill(labels.injection_summary, { n })] : [];
}

export function renderSummary(model, labels) {
  const lines = [
    titleLine(model, labels),
    peopleLine(model, labels),
    appleLine(model, labels),
    wordOfMouthLine(model, labels),
    ...findingLine(model, labels),
    ...injectionLine(model, labels),
    labels.decide_hint,
    `${labels.report_link}${labels.sep_colon}${REPORT_PATH}`,
  ];
  return `${lines.map(oneLine).join('\n')}\n`;
}
