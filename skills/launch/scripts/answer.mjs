// Gate the coordinator's answer to the builder's question and the changes it
// names. Pure functions: no file reads, no input mutation. An answer is shown
// only when real steps back it; a change only when its finding was confirmed.
// Text on references comes from the person's own step, never the coordinator.

import { resolveRefs } from './judgements.mjs';

export const ANSWERS = Object.freeze(['holds', 'partly', 'does_not_hold', 'not_reached']);
export const MAX_CHANGES = 3;

const STEP_KEYS = ['route', 'expected', 'saw'];
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim() !== '';
const drop = (kind, persona, step, reason) => ({ persona, kind, step, reason });
const emptyResult = (status, happened, dropped = []) => ({ status, answer: null, happened, breaks: [], evidence: [], dropped });

// Add route, expected and saw from the person's own step; keys the step lacks stay absent.
function withStepFields(ref, people) {
  const step = people.find((p) => p.id === ref.persona).steps.find((s) => s.step === ref.step);
  const extra = Object.fromEntries(STEP_KEYS.filter((k) => step[k] !== undefined).map((k) => [k, step[k]]));
  return { ...ref, ...extra };
}

const personIndex = (ref, people) => people.findIndex((p) => p.id === ref.persona);

function resolveSorted(list, people, kind) {
  const { refs, dropped } = resolveRefs(list, people, kind);
  const sorted = refs
    .map((r) => withStepFields(r, people))
    .sort((a, b) => a.step - b.step || personIndex(a, people) - personIndex(b, people));
  return { refs: sorted, dropped };
}

// Steps cited for a question that was never reached cannot back anything.
function droppedAsNotReached(list, kind) {
  if (!Array.isArray(list)) return [];
  return list.map((raw) => {
    const persona = isObject(raw) && typeof raw.persona === 'string' ? raw.persona : null;
    const step = isObject(raw) && typeof raw.step === 'number' ? raw.step : null;
    return drop(kind, persona, step, 'question not reached, so cited steps are not shown');
  });
}

export function gateQuestion(rawQuestion, people) {
  if (!isObject(rawQuestion)) return emptyResult('unanswered', '');
  const happened = typeof rawQuestion.happened === 'string' ? rawQuestion.happened.trim() : '';
  const { answer } = rawQuestion;
  if (!ANSWERS.includes(answer)) return emptyResult('unanswered', happened);
  if (answer === 'not_reached') {
    const dropped = [...droppedAsNotReached(rawQuestion.breaks, 'breaks'), ...droppedAsNotReached(rawQuestion.evidence, 'evidence')];
    return { ...emptyResult('not_reached', happened, dropped), answer };
  }
  const breaks = resolveSorted(rawQuestion.breaks, people, 'breaks');
  const evidence = resolveSorted(rawQuestion.evidence, people, 'evidence');
  const dropped = [...breaks.dropped, ...evidence.dropped];
  const needed = answer === 'holds' ? evidence.refs : breaks.refs;
  if (needed.length === 0) return emptyResult('bad_evidence', happened, dropped);
  return { status: 'answered', answer, happened, breaks: breaks.refs, evidence: evidence.refs, dropped };
}

function changeFault(raw, findings) {
  if (!isObject(raw) || !isText(raw.change)) return { reason: 'change without text' };
  const finding = findings.find((f) => f.fingerprint === raw.finding);
  if (!finding) return { reason: 'unknown finding' };
  if (finding.verification !== 'confirmed') return { reason: 'finding not confirmed on the page' };
  return { finding };
}

function gateChange(raw, people, findings) {
  const fault = changeFault(raw, findings);
  if (fault.reason) return { dropped: [drop('change', null, null, fault.reason)] };
  const { refs, dropped } = resolveSorted(raw.evidence, people, 'evidence');
  if (refs.length === 0) return { dropped: [...dropped, drop('change', null, null, 'change without a valid step')] };
  const { fingerprint, route, element } = fault.finding;
  const item = { change: raw.change.trim(), finding: { fingerprint, route, name: element?.name ?? '' }, evidence: refs };
  return { item, dropped };
}

export function gateChanges(rawChanges, people, findings) {
  if (rawChanges === undefined) return { changes: [], dropped: [] };
  if (!Array.isArray(rawChanges)) return { changes: [], dropped: [drop('change', null, null, 'changes is not an array')] };
  const results = rawChanges.map((raw) => gateChange(raw, people, findings));
  const valid = results.filter((r) => r.item).map((r) => r.item);
  const tooMany = valid.slice(MAX_CHANGES).map(() => drop('change', null, null, `more than ${MAX_CHANGES} changes`));
  return { changes: valid.slice(0, MAX_CHANGES), dropped: [...results.flatMap((r) => r.dropped), ...tooMany] };
}
