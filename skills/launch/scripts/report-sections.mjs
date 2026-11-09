// Every section of the report other than the top of the page, the overview and the people themselves.
import {
  e, feelingText, fill, outcomeText, routeText, screenshotLink, stopReasonText,
} from './report-format.mjs';

const section = (id, title, body) => `<section id="section-${id}" class="block"><h2>${e(title)}</h2>\n${body}</section>\n`;

function refBlock(ref, labels) {
  const who = `${e(ref.name)} · ${fill(labels.step_n, { n: ref.step })}`;
  const shot = screenshotLink(ref.screenshot, `${ref.name} ${ref.step}`, 'thumb');
  return `<div class="ref"><div><p class="ref-who">${who}</p><p>${e(ref.thought)} <span class="small">(${feelingText(ref.feeling, labels)})</span></p></div>${shot}</div>`;
}

const refList = (refs, labels) => (refs.length > 0 ? `<div class="refs">${refs.map((r) => refBlock(r, labels)).join('')}</div>` : '');

export function warningSection(model, labels) {
  if (!model.apple.warn) return '';
  const tag = labels[`apple_${model.apple.status}`] ?? model.apple.status;
  const tagHtml = model.apple.status === 'experimental' ? `<span class="tag">${e(tag)}</span>` : '';
  return `<section id="section-apple" class="block"><h2>${e(labels.apple_warning)}${tagHtml}</h2>`
    + `<p>${fill(labels.apple_summary, model.apple)}</p><p class="note">${e(labels.apple_check_note)}</p></section>\n`;
}

// The route is kept exactly as recorded here: the query can be the very thing that was aimed at an agent.
export function injectionSection(model, labels) {
  const attempts = model.injection_attempts ?? [];
  if (attempts.length === 0) return '';
  const head = `<tr><th>${e(labels.injection_person)}</th><th>${e(labels.injection_route)}</th><th>${e(labels.injection_quote)}</th></tr>`;
  const rows = attempts.map((a) => `<tr><td>${e(a.person)}</td><td class="route">${e(a.route)}</td><td>${e(a.quote)}</td></tr>`).join('');
  return section('injection', labels.injection_title, `<p class="note">${e(labels.injection_note)}</p><div class="tablewrap"><table>${head}${rows}</table></div>`);
}

function timelineRow(label, t, labels) {
  if (!t) return `<tr><th>${e(label)}</th><td colspan="4">${e(labels.placeholder)}</td></tr>`;
  return `<tr><th>${e(label)}</th><td>${outcomeText(t.outcome, labels)}</td><td>${stopReasonText(t.stop_reason, labels)}</td><td class="route">${routeText(t.left_at, labels)}</td><td>${fill(labels.steps_count, { n: t.steps })}</td></tr>`;
}

export function rerunSection(model, labels) {
  const r = model.rerun;
  if (!r) return '';
  const note = r.note ? `<p class="note">${e(r.note)}</p>` : '';
  const head = `<tr><th></th><th>${e(labels.outcome)}</th><th>${e(labels.stop_reason)}</th><th>${e(labels.left_at)}</th><th>${e(labels.steps_label)}</th></tr>`;
  const rows = timelineRow(labels.previous_run, r.previous, labels) + timelineRow(labels.this_run, r.current, labels);
  return section('rerun', labels.rerun_title, `${note}<div class="tablewrap"><table>${head}${rows}</table></div>`);
}

function chainRow(chain) {
  const earlier = chain.hops.slice(0, -1).map((h) => `<p class="hop">${e(h)}</p>`).join('');
  return `<li class="chain"><p class="hop-who">${e(chain.name)}</p>${earlier}<p class="final">${e(chain.hops.at(-1))}</p></li>`;
}

export function telephoneSection(model, labels) {
  if (model.telephone.length === 0) return '';
  const vision = `<p class="vision-line">${e(labels.vision_label)}${e(labels.sep_colon)}${e(model.vision)}</p>`;
  return section('telephone', labels.telephone_title, `${vision}<ul class="list">${model.telephone.map(chainRow).join('')}</ul>`);
}

export function commentsSection(model, labels) {
  if (model.comments.length === 0) return '';
  const body = model.comments.map((c) => `<li class="comment"><p class="hop-who">${e(c.author)}</p><p>${e(c.text)}</p>${refList(c.evidence, labels)}</li>`).join('');
  return section('comments', labels.comments_title, `<ul class="list">${body}</ul>`);
}

function assumptionBlock(a, labels) {
  const what = a.status === 'seen' ? a.happened : labels.not_encountered;
  const happened = what ? `<p>${e(what)}</p>` : '';
  return `<div class="claim"><div><p class="eyebrow">${e(labels.claim)}</p><p class="claim-text">${e(a.claim)}</p></div>`
    + `<div><p class="eyebrow">${e(labels.happened)}</p>${happened}${refList(a.evidence, labels)}</div></div>`;
}

export function assumptionsSection(model, labels) {
  if (model.assumptions.length === 0) return '';
  return section('assumptions', labels.assumptions_title, model.assumptions.map((a) => assumptionBlock(a, labels)).join(''));
}

function conflictBlock(c, labels) {
  const sides = c.sides.map((s) => `<div class="side">${s.label ? `<h4>${e(s.label)}</h4>` : ''}${refList(s.reasons, labels)}</div>`).join('');
  const note = c.vision_note ? `<p class="note">${e(labels.vision_note)}${e(labels.sep_colon)}${e(c.vision_note)}</p>` : '';
  return `<article class="conflict"><h3>${e(c.question)}</h3><div class="sides">${sides}</div>${note}</article>\n`;
}

export function conflictsSection(model, labels) {
  if (model.conflicts.length === 0) return '';
  return `<div id="section-conflicts" class="block"><h2 class="sr">${e(labels.conflicts_title)}</h2>\n${model.conflicts.map((c) => conflictBlock(c, labels)).join('')}</div>\n`;
}

export function notCheckedSection(model, labels) {
  if (model.not_checked.length === 0) return '';
  return section('not-checked', labels.not_checked_title, `<ul class="plain">${model.not_checked.map((t) => `<li>${e(t)}</li>`).join('')}</ul>`);
}
