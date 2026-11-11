// Text helpers shared by the report sections. Everything here returns text that is safe to put in HTML,
// except prettyRoute, which is plain text (the caller escapes it for HTML).
import { isSafeRelativePath } from './stories.mjs';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export const e = escapeHtml;
export const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, k) => e(values[k] ?? 0));
export const shown = (value, labels) => (value === null || value === undefined || value === '' ? e(labels.placeholder) : e(value));
export const hasStarted = (person) => person.outcome !== null && person.outcome !== undefined && person.outcome !== '';
export const outcomeText = (outcome, labels) => (
  outcome === null || outcome === undefined || outcome === '' ? e(labels.outcome_not_started) : e(labels[`outcome_${outcome}`] ?? outcome));
// The step limit belongs to the test. Someone it stopped did not choose to leave, so the report never calls it giving up.
export const ranOutOfSteps = (person) => person.outcome === 'abandoned' && person.stop_reason === 'step_limit';
export const personOutcomeText = (person, labels) => (
  ranOutOfSteps(person) ? e(labels.outcome_step_limit) : outcomeText(person.outcome, labels));
export const stopReasonText = (reason, labels) => shown(labels[`stop_reason_${reason}`] ?? reason, labels);
export const feelingText = (feeling, labels) => e(labels[`feeling_${feeling}`] ?? feeling);

// Joins pieces of finished HTML, so an absent piece never leaves a stray separator.
export const dotted = (parts) => parts.filter((part) => part !== '').join(' · ');

export const MAX_ROUTE_CHARS = 48;
const ELLIPSIS = '…';

function decoded(path) {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function truncated(text, limit) {
  const chars = Array.from(text);
  return chars.length > limit ? `${chars.slice(0, limit).join('')}${ELLIPSIS}` : text;
}

// Plain text, for markdown as well as HTML: escape it where it goes into HTML (routeText does).
// The query comes off before decoding, so an escaped question mark in the path is not mistaken for one.
export function prettyRoute(route) {
  if (route === null || route === undefined) return '';
  const [path] = String(route).split('?');
  return truncated(decoded(path), MAX_ROUTE_CHARS);
}

export const routeText = (route, labels) => e(prettyRoute(route) || labels.placeholder);

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

export function prettyDate(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return escapeHtml(ISO_DAY.test(text) && !Number.isNaN(Date.parse(text)) ? text.slice(0, 10) : text);
}

// Screenshots are shown only as files beside the report: never a URL, an absolute path or a way out of the run folder.
export const screenshotPath = (value) => (isSafeRelativePath(value) ? value : null);

export function screenshotLink(screenshot, alt, className) {
  const path = screenshotPath(screenshot);
  if (!path) return '';
  return `<a class="${e(className)}" href="${e(path)}" target="_blank" rel="noopener"><img src="${e(path)}" alt="${e(alt)}" loading="lazy"></a>`;
}
