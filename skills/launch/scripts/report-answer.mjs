// The top of a report that has a question: the question and its answer, where it broke,
// what to change first and who the people were. Every text goes through e().
import { e, fill, hasStarted, prettyRoute, screenshotLink } from './report-format.mjs';
import { realChecksSection } from './report-sections.mjs';

const MAX_SHOT_ALT = 80;
const names = (refs) => [...new Set(refs.map((r) => r.name))];
const stepWord = (n, labels) => fill(labels.step_n, { n });

export function answerWord(q, labels) {
  const key = q.status === 'answered' ? q.answer : q.status;
  return labels[`q_${key}`] ?? labels.q_unanswered;
}

const answerClass = (q) => (q.status === 'answered' ? 'q-answer' : 'q-answer q-quiet');

function whoLine(q, model, labels) {
  if (q.status !== 'answered') return '';
  const stuck = names(q.breaks);
  const rest = model.overview.filter(hasStarted).map((p) => p.name).filter((n) => !stuck.includes(n));
  const part = (label, list) => (list.length > 0 ? `${e(label)}${e(labels.sep_colon)}${list.map(e).join(e(labels.sep_list))}` : '');
  const parts = [part(labels.q_stuck, stuck), part(labels.q_not_stuck, rest)].filter((p) => p !== '');
  return parts.length > 0 ? `<p class="q-who">${parts.join(e(labels.sep_clause))}</p>` : '';
}

function expectedSaw(ref, labels) {
  const rows = [[labels.q_expected, ref.expected], [labels.q_saw, ref.saw]].filter(([, text]) => typeof text === 'string' && text !== '');
  if (rows.length === 0) return '';
  return `<dl class="after">${rows.map(([label, text]) => `<dt>${e(label)}</dt><dd>${e(text)}</dd>`).join('')}</dl>`;
}

function breakBlock(ref, labels) {
  const where = [e(ref.name), e(stepWord(ref.step, labels)), ref.route ? `<span class="route">${e(prettyRoute(ref.route))}</span>` : ''].filter((p) => p !== '');
  const shot = screenshotLink(ref.screenshot, `${ref.name} ${ref.step}`.slice(0, MAX_SHOT_ALT), 'break-shot');
  return `<div class="break"><p class="break-who">${where.join(' · ')}</p>${shot}`
    + `<p class="break-thought">${e(labels.quote_open)}${e(ref.thought)}${e(labels.quote_close)}</p>${expectedSaw(ref, labels)}</div>`;
}

function breaksBlock(q, labels) {
  if (q.status !== 'answered' || q.breaks.length === 0) return '';
  return `<h3>${e(labels.q_breaks_title)}</h3>${q.breaks.map((r) => breakBlock(r, labels)).join('')}`;
}

function compareCell(label, q, labels) {
  const quotes = q.breaks.map((r) => `<p class="small">${e(stepWord(r.step, labels))}${e(labels.sep_colon)}${e(labels.quote_open)}${e(r.thought)}${e(labels.quote_close)}</p>`).join('');
  return `<div><p class="eyebrow">${e(label)}</p><p class="claim-text">${e(answerWord(q, labels))}</p>${quotes}</div>`;
}

function compareBlock(q, labels) {
  if (!q.earlier) return '';
  return `<div class="q-compare">${compareCell(labels.q_last_time, q.earlier, labels)}${compareCell(labels.q_this_time, q, labels)}</div>`;
}

export function questionSection(model, labels) {
  const q = model.question;
  if (!q) return '';
  const tag = q.is_default ? `<span class="tag">${e(labels.q_default)}</span>` : '';
  const happened = q.happened === '' ? '' : `<p class="q-happened">${e(q.happened)}</p>`;
  return `<section id="section-question" class="q"><p class="q-label">${e(labels.q_title)}${tag}</p>`
    + `<h2 class="q-text">${e(labels.quote_open)}${e(q.text)}${e(labels.quote_close)}</h2>`
    + `<p class="${answerClass(q)}">${e(answerWord(q, labels))}</p>${happened}${whoLine(q, model, labels)}`
    + `<p class="note">${e(labels.single_run_note)}</p>${compareBlock(q, labels)}${breaksBlock(q, labels)}</section>\n`;
}

function basisItem(ref, labels) {
  const shot = screenshotLink(ref.screenshot, `${ref.name} ${ref.step}`.slice(0, MAX_SHOT_ALT), 'thumb');
  return `<span class="basis-item"><span>${e(ref.name)} · ${e(stepWord(ref.step, labels))}</span>${shot}</span>`;
}

function changeItem(change, labels) {
  const basis = `<span>${e(labels.changes_basis)}</span>${change.evidence.map((r) => basisItem(r, labels)).join('')}`;
  return `<li><p class="change-text">${e(change.change)}</p><div class="basis">${basis}</div></li>`;
}

function offerLine(model, labels) {
  const ids = [...new Set((model.question?.breaks ?? []).map((r) => r.persona))];
  if (ids.length === 0 || model.changes.length === 0) return '';
  const cmd = ids.map((id) => `--rerun ${id}`).join(labels.sep_list);
  return `<p class="offer">${fill(labels.changes_offer, { cmd })}</p>`;
}

export function changesSection(model, labels) {
  if (!model.question) return '';
  const list = model.changes.length === 0
    ? `<p class="note">${e(labels.changes_empty)}</p>`
    : `<ol>${model.changes.map((c) => changeItem(c, labels)).join('')}</ol>`;
  return `<section id="section-changes" class="changes block"><h2>${e(labels.changes_title)}</h2>${list}</section>\n`
    + `${realChecksSection(model, labels)}${offerLine(model, labels)}`;
}

function introRow(p, labels) {
  const lines = [p.situation, p.arrival].filter((t) => typeof t === 'string' && t !== '').map((t) => `<p>${e(t)}</p>`).join('');
  const why = p.why_chosen ? `<p class="small">${e(labels.why_chosen_label)}${e(labels.sep_colon)}${e(p.why_chosen)}</p>` : '';
  return `<li><p class="name">${e(p.name)}</p>${lines}${why}</li>`;
}

export function peopleIntroSection(model, labels) {
  if (!model.question || model.people_intro.length === 0) return '';
  return `<section id="section-intro" class="intro block"><h2>${e(labels.intro_title)}</h2>`
    + `<ul>${model.people_intro.map((p) => introRow(p, labels)).join('')}</ul><p class="how">${e(labels.intro_how)}</p></section>\n`;
}
