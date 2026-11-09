// Gate coordinator-written judgements and telephone chains against traced steps.
// Pure functions: no file reads, no input mutation. Text on references always
// comes from the person's own step, never from coordinator text.

export const TEST_LIMITS = Object.freeze(['location', 'account', 'forms_off', 'automation', 'other']);
export const MAX_REAL_CHECKS = 6;
export const stepKey = (persona, step) => `${persona}#${step}`;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim() !== '';
const drop = (kind, persona, step, reason) => ({ persona, kind, step, reason });
const asPersona = (v) => (typeof v === 'string' ? v : null);
const asStep = (v) => (typeof v === 'number' ? v : null);

function resolveRef(raw, people, dropKind) {
  const persona = isObject(raw) ? asPersona(raw.persona) : null;
  const step = isObject(raw) ? asStep(raw.step) : null;
  const fail = (why) => ({ ref: null, dropped: drop(dropKind, persona, step, why) });
  if (!isObject(raw)) return fail('reference is not an object');
  const person = people.find((p) => p.id === persona);
  if (!person) return fail('unknown person');
  const found = person.steps.find((s) => s.step === step);
  if (!found) return fail('step not taken by this person');
  const { thought, feeling, screenshot } = found;
  return { ref: { persona: person.id, name: person.name, step: found.step, thought, feeling, screenshot }, dropped: null };
}

function resolveRefs(list, people, dropKind) {
  const results = (Array.isArray(list) ? list : []).map((r) => resolveRef(r, people, dropKind));
  return {
    refs: results.filter((r) => r.ref).map((r) => r.ref),
    dropped: results.filter((r) => r.dropped).map((r) => r.dropped),
  };
}

function gateAssumption(raw, people) {
  if (!isObject(raw) || !isText(raw.claim)) return { dropped: [drop('judgements', null, null, 'assumption without a claim')] };
  const { refs, dropped } = resolveRefs(raw.evidence, people, 'evidence');
  if (refs.length === 0) {
    return { item: { claim: raw.claim, status: 'not_encountered', happened: null, evidence: [] }, dropped };
  }
  if (typeof raw.happened !== 'string') {
    return { dropped: [...dropped, drop('judgements', null, null, `assumption "${raw.claim}" has no happened text`)] };
  }
  return { item: { claim: raw.claim, status: 'seen', happened: raw.happened, evidence: refs }, dropped };
}

function gateConflict(raw, people) {
  const question = isObject(raw) && isText(raw.question) ? raw.question : '';
  const rawSides = isObject(raw) && Array.isArray(raw.sides) ? raw.sides : [];
  const dropped = [];
  const sides = [];
  for (const side of rawSides) {
    const res = resolveRefs(isObject(side) ? side.reasons : null, people, 'reason');
    dropped.push(...res.dropped);
    if (res.refs.length > 0) sides.push({ label: typeof side.label === 'string' ? side.label : '', reasons: res.refs });
  }
  if (question === '' || sides.length < 2) {
    return { dropped: [...dropped, drop('conflict', null, null, question === '' ? 'conflict without a question' : 'fewer than two sides with valid reasons')] };
  }
  const vision_note = typeof raw.vision_note === 'string' ? raw.vision_note : '';
  return { item: { question, sides, vision_note }, dropped };
}

function gateTestLimit(raw, people) {
  const limit = isObject(raw) && TEST_LIMITS.includes(raw.limit) ? raw.limit : null;
  const note = isObject(raw) && isText(raw.note) ? raw.note : '';
  const { refs, dropped } = resolveRefs(isObject(raw) ? raw.evidence : null, people, 'evidence');
  if (limit === null || note === '' || refs.length === 0) {
    const why = limit === null ? 'unknown test limit kind' : note === '' ? 'test limit without a note' : 'test limit without a valid step';
    return { dropped: [...dropped, drop('test_limit', null, null, why)] };
  }
  return { item: { limit, note, evidence: refs }, dropped };
}

function gateRealCheck(raw, people) {
  const who = isObject(raw) && isText(raw.who) ? raw.who : '';
  const ask = isObject(raw) && isText(raw.ask) ? raw.ask : '';
  const { refs, dropped } = resolveRefs(isObject(raw) ? raw.evidence : null, people, 'evidence');
  if (who === '' || ask === '' || refs.length === 0) {
    const why = who === '' ? 'real check without who' : ask === '' ? 'real check without a question' : 'real check without a valid step';
    return { dropped: [...dropped, drop('real_check', null, null, why)] };
  }
  return { item: { who, ask, evidence: refs }, dropped };
}

function gateSection(raw, key, people, gateOne) {
  if (raw[key] === undefined) return { items: [], dropped: [] };
  if (!Array.isArray(raw[key])) return { items: [], dropped: [drop('judgements', null, null, `${key} is not an array`)] };
  const results = raw[key].map((entry) => gateOne(entry, people));
  return { items: results.filter((r) => r.item).map((r) => r.item), dropped: results.flatMap((r) => r.dropped) };
}

export function gateJudgements(raw, people) {
  if (!isObject(raw)) {
    return { assumptions: [], conflicts: [], real_checks: [], test_limits: [], not_checked: [], dropped: [drop('judgements', null, null, 'judgements is not an object')] };
  }
  const assumptions = gateSection(raw, 'assumptions', people, gateAssumption);
  const conflicts = gateSection(raw, 'conflicts', people, gateConflict);
  const realChecks = gateSection(raw, 'real_checks', people, gateRealCheck);
  const testLimits = gateSection(raw, 'test_limits', people, gateTestLimit);
  const notChecked = raw.not_checked;
  const badNotChecked = notChecked !== undefined && !Array.isArray(notChecked);
  return {
    assumptions: assumptions.items,
    conflicts: conflicts.items,
    real_checks: realChecks.items.slice(0, MAX_REAL_CHECKS),
    test_limits: testLimits.items,
    not_checked: Array.isArray(notChecked) ? notChecked.filter(isText) : [],
    dropped: [
      ...assumptions.dropped,
      ...conflicts.dropped,
      ...realChecks.dropped,
      ...testLimits.dropped,
      ...(badNotChecked ? [drop('judgements', null, null, 'not_checked is not an array')] : []),
    ],
  };
}

function gateChain(raw, people) {
  const from = isObject(raw) ? asPersona(raw.from) : null;
  const fail = (why) => ({ dropped: [drop('chain', from, null, why)] });
  const person = people.find((p) => p.id === from);
  if (!person) return fail('unknown person');
  const friend = person.last_words?.tell_a_friend;
  if (!isText(friend)) return fail('person has no tell_a_friend to start the chain');
  const hops = raw.hops;
  if (!Array.isArray(hops) || hops.length !== 2 || !hops.every(isText)) return fail('hops must be exactly two non-empty strings');
  const comment = isText(raw.comment) ? raw.comment.trim() : null;
  return { item: { from: person.id, name: person.name, hops: [friend, hops[0], hops[1]], comment }, dropped: [] };
}

export function gateTelephone(raw, people) {
  if (!isObject(raw)) {
    return { chains: [], dropped: [drop('telephone', null, null, 'telephone is not an object')] };
  }
  const section = gateSection(raw, 'chains', people, gateChain);
  const dropped = section.dropped.map((d) => (d.kind === 'judgements' ? { ...d, kind: 'telephone' } : d));
  return { chains: section.items, dropped };
}
