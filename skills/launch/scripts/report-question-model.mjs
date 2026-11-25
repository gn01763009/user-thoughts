// The creator's question as the report model carries it: the gated answer, the changes
// confirmed on the page, the people to introduce and how a rerun compares with last time.
// Pure: nothing here reads a file or changes its input.
import { gateChanges, gateQuestion } from './answer.mjs';
import { cardProfile } from './stories.mjs';

const asArray = (v) => (Array.isArray(v) ? v : []);
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export const hasQuestion = (run) => typeof run?.question === 'string' && run.question.trim() !== '';

// The same person's answer in the previous run, or null when it cannot be told.
function earlierAnswer(run, previous, previousJudgements) {
  if (typeof run.rerun_of !== 'string' || run.rerun_of === '') return null;
  if (!isObject(previous) || !isObject(previousJudgements) || !isObject(previousJudgements.question)) return null;
  const id = asArray(run.personas)[0];
  const people = asArray(previous.people).map((p) => ({ ...p, ...cardProfile(p) }));
  const { dropped, ...gated } = gateQuestion(previousJudgements.question, people);
  const mine = (refs) => refs.filter((r) => r.persona === id);
  return { ...gated, breaks: mine(gated.breaks), evidence: mine(gated.evidence) };
}

function introOf(person) {
  const { id, name, situation, arrival, why_chosen: whyChosen } = person;
  return { id, name, situation, arrival, why_chosen: whyChosen };
}

// With no question every field is empty and the rest of the model is untouched.
export function buildQuestionParts({ run, merged, judgements, previous, previousJudgements, people }) {
  if (!hasQuestion(run)) return { question: null, changes: [], people_intro: [], dropped: 0 };
  const answer = gateQuestion(judgements?.question, people);
  const changes = gateChanges(judgements?.changes, people, asArray(merged.findings));
  const { dropped, ...gated } = answer;
  return {
    question: { text: run.question, is_default: run.question_default === true, ...gated, earlier: earlierAnswer(run, previous, previousJudgements) },
    changes: changes.changes,
    people_intro: people.map(introOf),
    dropped: dropped.length + changes.dropped.length,
  };
}
