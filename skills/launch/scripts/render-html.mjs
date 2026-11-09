// report.html: one static file that holds everything except the screenshots, which sit beside it.
// All text goes through escapeHtml. There is no script at all, and the policy says so.
import { e, escapeHtml } from './report-format.mjs';
import { CSS } from './report-theme.mjs';
import { masthead, overviewSection } from './report-overview.mjs';
import { peopleSection } from './report-person.mjs';
import {
  assumptionsSection, commentsSection, conflictsSection, injectionSection, notCheckedSection, rerunSection, telephoneSection, warningSection,
} from './report-sections.mjs';

export { escapeHtml };

const CONTENT_SECURITY_POLICY = "default-src 'none'; img-src 'self' file: data:; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'";

// Spec order. A section with nothing to say returns '' and is left out.
const SECTIONS = [
  warningSection, injectionSection, rerunSection, overviewSection, peopleSection,
  telephoneSection, commentsSection, assumptionsSection, conflictsSection, notCheckedSection,
];

function documentHead(title) {
  return `<head>\n<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${e(CONTENT_SECURITY_POLICY)}">\n`
    + `<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${e(title)}</title>\n<style>${CSS}</style>\n</head>\n`;
}

export function renderReport(model, labels) {
  const sections = SECTIONS.map((render) => render(model, labels)).join('');
  const body = `<body>\n<main class="page">\n${masthead(model, labels)}${sections}</main>\n</body>\n`;
  return `<!DOCTYPE html>\n<html lang="${e(model.language)}">\n${documentHead(`${labels.html_title} · ${model.host}`)}${body}</html>\n`;
}
