// Assembles each person's story and the bad-idea ("apple") tally for merged.json.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function peopleProblem(people) {
  if (people === undefined) return null;
  const ok = Array.isArray(people) && people.every((card) => isObject(card) && typeof card.id === 'string');
  return ok ? null : 'people must be an array of objects with a string id';
}

const PNG = /\.png$/i;
const ENCODED_DOT_OR_SLASH = /%(2e|2f|5c)/i;

// Only a .png beside the run, and no percent-escaped dot or slash that a browser could turn into a way out.
export function isSafeRelativePath(p) {
  if (typeof p !== 'string' || p === '') return false;
  if (!PNG.test(p) || ENCODED_DOT_OR_SLASH.test(p)) return false;
  if (p.startsWith('/') || p.startsWith('\\') || p.includes(':')) return false;
  return !p.split(/[/\\]/).includes('..');
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function screenshotProblem(runDir, id, screenshot) {
  if (!isSafeRelativePath(screenshot)) return 'unsafe screenshot path';
  return isFile(join(runDir, id, screenshot)) ? null : 'screenshot missing';
}

function toStep(id, record) {
  const { step, route, action, thought, feeling, screenshot, progress } = record;
  return { step, route, action, thought, feeling, screenshot: `${id}/${screenshot}`, progress };
}

function buildSteps(id, trace, runDir) {
  const steps = [];
  const dropped = [];
  for (const record of trace) {
    const reason = screenshotProblem(runDir, id, record.screenshot);
    if (reason === null) steps.push(toStep(id, record));
    else dropped.push({ persona: id, kind: 'thought', step: record.step, reason });
  }
  return { steps, dropped };
}

function citeKept(block, kind, id, keptSteps) {
  if (!block) return { value: null, dropped: [] };
  const steps = block.steps.filter((n) => keptSteps.has(n));
  if (steps.length > 0) return { value: { ...block, steps }, dropped: [] };
  return { value: null, dropped: [{ persona: id, kind, step: null, reason: 'no traced step' }] };
}

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');
const cleanList = (value) => (Array.isArray(value) ? value.map(cleanText).filter(Boolean) : []);

// What a card says about the person beyond the situation. Normalised here, and again for merged.json files from older runs.
export function cardProfile(card) {
  return {
    facts: cleanList(card?.facts),
    about: cleanText(card?.about),
    cares: cleanList(card?.cares),
    voice: cleanText(card?.voice),
    why_chosen: cleanText(card?.why_chosen),
  };
}

function buildPerson(card, loaded, runDir) {
  const { id, summary, trace } = loaded;
  const { steps, dropped } = buildSteps(id, trace, runDir);
  const kept = new Set(steps.map((s) => s.step));
  const words = citeKept(summary?.last_words, 'last_words', id, kept);
  const comment = citeKept(summary?.launch_comment, 'launch_comment', id, kept);
  const person = {
    id,
    name: card?.name ?? id,
    base: card?.base ?? '',
    situation: card?.situation ?? '',
    ...cardProfile(card),
    came_for: summary?.came_for ?? null,
    outcome: summary?.outcome ?? null,
    stop_reason: summary?.stop_reason ?? null,
    left_at: summary?.left_at ?? null,
    steps,
    last_words: words.value,
    apple: summary?.apple ?? null,
    launch_comment: comment.value,
  };
  return { person, dropped: [...dropped, ...words.dropped, ...comment.dropped] };
}

export function buildPeople(cards, loaded, runDir) {
  const results = loaded.map((entry) => buildPerson(cards.find((c) => c.id === entry.id), entry, runDir));
  return { people: results.map((r) => r.person), dropped: results.flatMap((r) => r.dropped) };
}

export function tallyApple(people) {
  const answers = people.flatMap((p) => (p.apple ? [p.apple.answer] : []));
  const count = (answer) => answers.filter((a) => a === answer).length;
  const asked = answers.length;
  const yes = count('yes');
  return { asked, yes, no: count('no'), unsure: count('unsure'), warn: asked > 0 && yes * 2 > asked };
}
