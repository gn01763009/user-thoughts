// report.html: one static file that holds everything except the screenshots, which sit beside it.
// All text goes through escapeHtml. There is no script at all, and the policy says so.
import { e, escapeHtml } from './report-format.mjs';
import { CSS } from './report-theme.mjs';
import { ANSWER_CSS } from './report-answer-theme.mjs';
import { changesSection, peopleIntroSection, questionSection } from './report-answer.mjs';
import { masthead, overviewSection } from './report-overview.mjs';
import { peopleSection } from './report-person.mjs';
import {
  assumptionsSection, commentsSection, conflictsSection, contentSection, decidedSection, injectionSection, notCheckedSection, questionedSection, realChecksSection, rerunSection, telephoneSection, testLimitsSection, warningSection,
} from './report-sections.mjs';

export { escapeHtml };

const CONTENT_SECURITY_POLICY = "default-src 'none'; img-src 'self' file: data:; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'";

// Spec order. A section with nothing to say returns '' and is left out.
const SECTIONS = [
  warningSection, injectionSection, rerunSection, overviewSection, peopleSection,
  telephoneSection, commentsSection, assumptionsSection, conflictsSection, questionedSection, contentSection, realChecksSection, decidedSection, testLimitsSection, notCheckedSection,
];

// Question mode: what answers the question stays open, every other section folds under its own title.
const VISIBLE = [warningSection, injectionSection, rerunSection, questionSection, changesSection, peopleIntroSection];
const FOLDED = [
  [overviewSection, 'overview_title'], [peopleSection, 'stories_title'], [telephoneSection, 'telephone_title'], [commentsSection, 'comments_title'],
  [assumptionsSection, 'assumptions_title'], [conflictsSection, 'conflicts_title'], [questionedSection, 'questioned_title'], [contentSection, 'content_title'],
  [decidedSection, 'decided_title'], [testLimitsSection, 'test_limits_title'], [notCheckedSection, 'not_checked_title'],
];

function folded([render, titleKey], model, labels) {
  const html = render(model, labels);
  return html === '' ? '' : `<details class="fold"><summary>${e(labels[titleKey])}</summary>${html}</details>\n`;
}

function questionSections(model, labels) {
  return VISIBLE.map((render) => render(model, labels)).join('') + FOLDED.map((entry) => folded(entry, model, labels)).join('');
}

function documentHead(title, css) {
  return `<head>\n<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${e(CONTENT_SECURITY_POLICY)}">\n`
    + `<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${e(title)}</title>\n<style>${css}</style>\n</head>\n`;
}

export function renderReport(model, labels) {
  const asked = model.question != null;
  const sections = asked ? questionSections(model, labels) : SECTIONS.map((render) => render(model, labels)).join('');
  const body = `<body>\n<main class="page">\n${masthead(model, labels)}${sections}</main>\n</body>\n`;
  return `<!DOCTYPE html>\n<html lang="${e(model.language)}">\n${documentHead(`${labels.html_title} · ${model.host}`, asked ? CSS + ANSWER_CSS : CSS)}${body}</html>\n`;
}
