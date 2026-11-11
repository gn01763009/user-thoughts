// One person's section: who they are, the moment that mattered most, and every other step one tap away.
import {
  dotted, e, feelingText, fill, personOutcomeText, routeText, screenshotLink, stopReasonText,
} from './report-format.mjs';
import { keyMoment } from './report-moment.mjs';

const paragraph = (className, html) => (html === '' ? '' : `<p class="${className}">${html}</p>`);
const labelled = (label, value, labels) => `${e(label)}${e(labels.sep_colon)}${value}`;
const wouldReturn = (words, labels) => (words ? e(labels[`would_return_${words.would_return}`] ?? words.would_return) : '');

// These stops come from a boundary, not from the person's choice, so the builder is told which one.
const BOUNDARY_STOPS = new Set(['unsafe_action', 'login_wall', 'bot_check']);

function statusOf(person, labels) {
  const boundary = BOUNDARY_STOPS.has(person.stop_reason) ? stopReasonText(person.stop_reason, labels) : '';
  return dotted([personOutcomeText(person, labels), boundary, wouldReturn(person.last_words, labels)]);
}

function introduction(person, labels) {
  const cares = person.cares.length > 0 ? `<span class="cares-label">${e(labels.cares_label)}</span>${dotted(person.cares.map(e))}` : '';
  const chosen = person.why_chosen === '' ? '' : labelled(labels.why_chosen_label, e(person.why_chosen), labels);
  return `<header><div class="who"><h3>${e(person.name)}</h3>${paragraph('status', statusOf(person, labels))}</div>`
    + `${paragraph('facts', dotted(person.facts.map(e)))}${paragraph('about', e(person.about))}${paragraph('cares', cares)}`
    + `${paragraph('situation', e(person.situation))}${paragraph('chosen', chosen)}</header>`;
}

const testLimitNote = (step, labels) => (step.test_limit ? paragraph('note', e(labels.test_limit_step_note)) : '');

function moment(person, labels) {
  const step = keyMoment(person);
  const none = `<p class="no-moment">${e(labels.no_moment)}</p>`;
  if (!step) return none;
  const stepWord = fill(labels.step_n, { n: step.step });
  const quote = `<blockquote class="key">${e(labels.quote_open)}${e(step.thought)}${e(labels.quote_close)}</blockquote>`;
  const caption = `<figcaption>${dotted([stepWord, `<span>${feelingText(step.feeling, labels)}</span>`])}</figcaption>`;
  const shot = screenshotLink(step.screenshot, `${person.name} ${stepWord}`, 'shot') || none;
  return `<figure class="moment">${quote}${shot}${caption}</figure>${testLimitNote(step, labels)}`;
}

function badIdeaLine(person, model, labels) {
  if (!person.apple) return '';
  const answer = labels[`answer_${person.apple.answer}`] ?? person.apple.answer;
  const tag = model.apple.status === 'experimental' ? `<span class="tag">${e(labels.apple_experimental)}</span>` : '';
  return `<p class="bad-idea">${e(labels.apple_reaction)}${tag}${e(labels.sep_colon)}${e(answer)}${e(labels.sep_comma)}${e(person.apple.why)}</p>`;
}

function afterwards(person, model, labels) {
  const words = person.last_words;
  const said = words
    ? `<dl class="after"><dt>${e(labels.tell_a_friend)}</dt><dd>${e(words.tell_a_friend)}</dd>`
      + `<dt>${e(labels.return_label)}</dt><dd>${wouldReturn(words, labels)}${e(labels.sep_sentence)}${e(words.why)}</dd></dl>`
    : `<p class="note">${e(labels.no_last_words)}</p>`;
  return `${said}${badIdeaLine(person, model, labels)}`;
}

function stepItem(step, person, labels) {
  const caption = dotted([e(step.action), `<span class="route">${routeText(step.route, labels)}</span>`, `<span>${feelingText(step.feeling, labels)}</span>`]);
  const thumb = screenshotLink(step.screenshot, `${person.name} ${fill(labels.step_n, { n: step.step })}`, 'thumb');
  return `<li value="${e(step.step)}"><div class="walk-step"><div><p>${e(step.thought)}</p><p class="cap">${caption}</p></div>${thumb}</div>${testLimitNote(step, labels)}</li>`;
}

function endLine(person, labels) {
  const reason = person.stop_reason ? labelled(labels.stop_reason, stopReasonText(person.stop_reason, labels), labels) : '';
  const left = person.left_at ? labelled(labels.left_at, `<span class="route">${routeText(person.left_at, labels)}</span>`, labels) : '';
  return paragraph('note', dotted([reason, left]));
}

function fullWalk(person, labels) {
  const end = endLine(person, labels);
  if (person.steps.length === 0) return end;
  const steps = person.steps.map((s) => stepItem(s, person, labels)).join('');
  return `<details><summary>${fill(labels.full_walk, { n: person.steps.length })}</summary><ol class="walk">${steps}</ol>${end}</details>`;
}

function personSection(person, model, labels) {
  return `<article class="person" id="person-${e(person.id)}">${introduction(person, labels)}${moment(person, labels)}${afterwards(person, model, labels)}${fullWalk(person, labels)}</article>\n`;
}

export function peopleSection(model, labels) {
  if (model.people.length === 0) return '';
  return `<div id="section-stories"><h2 class="sr">${e(labels.stories_title)}</h2>\n${model.people.map((p) => personSection(p, model, labels)).join('')}</div>\n`;
}
