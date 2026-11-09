// Which moment of a visit the report leads with, and the one sentence it quotes from it.
// Chosen by script from what the person recorded, never by a model, and never reworded.

// Weakest first, so a higher index is a stronger feeling. Anything unknown ranks below all of these.
const STRENGTH = Object.freeze(['fine', 'unsure', 'delighted', 'confused', 'annoyed', 'stuck']);
const strengthOf = (step) => STRENGTH.indexOf(step?.feeling);

const MIN_THOUGHT_CHARS = 8;
const isReal = (step) => typeof step.thought === 'string' && Array.from(step.thought.trim()).length >= MIN_THOUGHT_CHARS;

// Among steps tied on feeling the later one wins, as it best explains how the visit ended, unless its thought
// is filler: then the latest one with a real thought (8 characters or more) does.
export function keyMoment(person) {
  const steps = Array.isArray(person?.steps) ? person.steps : [];
  if (steps.length === 0) return null;
  const top = Math.max(...steps.map(strengthOf));
  const tied = steps.filter((step) => strengthOf(step) === top);
  return tied.findLast(isReal) ?? tied.at(-1);
}

// The overview sits under a heading about what the person would tell a friend, and has to make sense to
// someone who has not seen the site. So it is that line or nothing: a mid-visit thought would be the wrong words.
export function overviewQuote(person) {
  const told = person?.last_words?.tell_a_friend;
  return typeof told === 'string' ? told.trim() : '';
}
