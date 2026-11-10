// The top of the page and the overview: one row per person, each linking to that person's section.
import { dotted, e, fill, hasStarted, outcomeText, prettyDate } from './report-format.mjs';

const FINISHED = 'completed';

// Someone who never started did not use the site, so they are left out of the count and the status.
function statusLine(people, labels) {
  const done = people.filter((p) => p.outcome === FINISHED).length;
  if (done === 0) return e(labels.status_none);
  if (done === people.length) return e(labels.status_all);
  return fill(labels.status_some, { done, rest: people.length - done });
}

export function masthead(model, labels) {
  const started = model.overview.filter(hasStarted);
  const count = started.length;
  const used = fill(count === 1 ? labels.headline_used_one : labels.headline_used, { n: count, host: model.host });
  const depth = labels[`depth_${model.depth}`] ?? model.depth;
  const dropped = model.dropped_count > 0 ? ` ${fill(labels.dropped_note, { n: model.dropped_count })}` : '';
  return `<header class="top"><h1>${used}</h1><p class="lead">${statusLine(started, labels)}</p>`
    + `<p class="vision">${e(labels.vision_label)}${e(labels.sep_colon)}${e(model.vision)}</p>`
    + `<p class="meta">${dotted([prettyDate(model.date), e(depth), `${e(labels.simulated_note)}${dropped}`])}</p>`
    + `<p class="meta">${e(labels.single_run_note)}</p></header>\n`;
}

const optionalSpan = (className, text) => (text ? `<span class="${className}">${e(text)}</span>` : '');

function quoted(person, labels) {
  if (!person.pull_quote) return '';
  return `<span class="row-quote">${e(labels.sep_colon)}${e(labels.quote_open)}${e(person.pull_quote)}${e(labels.quote_close)}</span>`;
}

function row(person, labels) {
  const facts = person.facts.length > 0 ? `<span class="row-facts">${dotted(person.facts.map(e))}</span>` : '';
  const outcome = `<span class="row-out">${outcomeText(person.outcome, labels)}</span>`;
  return `<li><a class="row" href="#person-${e(person.id)}"><span class="row-title"><span class="row-name">${e(person.name)}</span>${quoted(person, labels)}</span>`
    + `${outcome}<span class="chev" aria-hidden="true">›</span>${facts}${optionalSpan('row-sub', person.came_for)}</a></li>`;
}

export function overviewSection(model, labels) {
  if (model.overview.length === 0) return '';
  return `<section id="section-overview" class="block"><h2 class="list-title">${e(labels.overview_title)}</h2><ul class="list">${model.overview.map((p) => row(p, labels)).join('')}</ul></section>\n`;
}
