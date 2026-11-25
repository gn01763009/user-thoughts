# The builder's question

People come to this skill right after changing something. The report is built to answer one question about that
change, so the question steers the run at four points. It never reaches a person.

## Asking it (Step 4, and Step 2 on a reused setup)

Ask, in the builder's language: "What did you just change, and what do you hope is true now?" Store the answer word for
word as `run.json` `question`, with `question_default: false`.

- The builder may skip it.
- A question already in the request is used as it stands, and you do not ask.
- On a reused setup, ask again, because a new change means a new question. Offer the saved `question` as the default
  answer. If the request already gives a question, use that.
- When it is skipped, or the saved one is gone, write a default from the main task in `understanding`, in the run's
  language: "Can someone arriving for the first time <main task>?" (for example 「第一次來的人能完成〈主要任務〉嗎？」).
  Store it as `question` with `question_default: true`.

## Keeping it out

The question is like the vision. It is in no brief, and you never quote, hint at or paraphrase it to a person, a relay,
the verifier or the reader. It stays in the run files and in your own Steps 6, 9 and 11.

## Choosing people (Step 6)

When you recommend people, say which of them have a need that would pass through what changed. The builder may swap
anyone. An `arrival` still states a need and never a feature, so this does not send anyone to the changed place.

## Picking items to verify (Step 9)

Of the up to 10 items, take first the findings that bear on the question, then fill the rest by the usual rule
(`critical` and `high` in the main or tentative band, then features with status `question_it`). A change is kept only
when the verifier confirmed its finding, so a finding that was never verified can never support a change.

## Writing the answer (Step 11)

Add `question` and `changes` to `judgements.json` (formats in `references/briefs.md`). The report prints the question
from `run.json`, so do not copy it.

| answer | Use when | Needs |
|---|---|---|
| `holds` | the people met what changed and it did what the builder hoped | at least one `evidence` step |
| `partly` | it held for some people or some steps and not others | at least one `breaks` step |
| `does_not_hold` | it did not hold where people met it | at least one `breaks` step |
| `not_reached` | nobody reached what changed | nothing |

- `breaks` are the steps where it did not hold. `evidence` are the steps where it did. A `holds` answer has no
  `breaks`; the script drops any it is given. Cite only steps in
  `merged.json` `people[].steps`. An answer with no step that resolves is not shown as an answer.
- `happened` is one or two sentences in the run's language. Name the people. Never give a percentage or write "most".
- When nobody reached what changed, answer `not_reached`. Never guess an answer from people who did not get there.
- `changes` holds at most 3 entries, each with one sentence saying what to change, the `finding` fingerprint copied from
  `merged.json`, and the steps. Include a change only for a problem that is a fact on the page and whose finding has
  `verification: "confirmed"`. Put a feeling-based item (taste, trust, willingness) into `real_checks` instead.
- Order `changes` with the ones that caused the `breaks` first, then the other confirmed problems. One change per
  finding: a second change citing the same finding is dropped.

## The offer (Step 12)

After you have passed the summary and the report path on unchanged, and only if the product's source is in the working
folder, ask once whether to make the listed changes, and say that you will then check them with `--rerun <id>` for the
people in `breaks`. Change nothing without a yes. If the source is not in the working folder, do not ask.
