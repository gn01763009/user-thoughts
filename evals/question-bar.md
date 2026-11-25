# Bar: answering the builder's question

Written and committed before any run below. Changing it after the results exist is not allowed; a new attempt needs a new file and a new set of questions.

## What is tested

The skill asks the builder one question about a change and answers it at the top of the report. The planted and clean sites are the same product: planted has known problems, clean has them fixed. So the right answer is known in advance.

| Question (asked in zh-TW, word for word) | Known problem |
|---|---|
| Q1 「改完的首頁，第一次來的人看得懂我們在賣什麼嗎？」 | U1 in `ground-truth/planted.json` |
| Q2 「第一次來的人找得到價格嗎？」 | U2 in `ground-truth/planted.json` |

Four runs, quick depth, Sonnet, unattended, with every setup answer given in the request: Q1 and Q2 on planted, Q1 and Q2 on clean. One run each, no repeats.

## Pass rules

- **Planted passes** when `judgements.json` `question.answer` is `does_not_hold` or `partly`, and the report shows at least one break whose step's route path is `/` or `/index.html`.
- **Clean passes** when the answer is not `does_not_hold`.
- **Counts as a fail on either site:** `not_reached`, an answer the report shows as bad evidence, or no answer.
- **The four together pass only if all four pass.** Otherwise report the raw results and do not say "passed". Do not tune the skill and rerun on these same two questions.

## Changes (regex, not a person's reading)

For each change kept in the report, the text matched is the change sentence plus the `interpretation` of every source of the finding it cites in `merged.json`. A change "matches" U1 or U2 when that text satisfies the problem's `all_of` groups in `ground-truth/planted.json`, as `evals/score.mjs` reads them.

- Planted runs: at least one kept change matches the question's problem (U1 for Q1, U2 for Q2).
- Clean runs: no kept change matches U1 or U2.
- Reported alongside, not scored: how many changes the coordinator wrote, how many the report kept, and how many were dropped because their finding was not `confirmed`.

## Rerun

After planted Q1, serve the clean site on the same port and run `--rerun` for one person cited in `breaks`. Passes when the rerun's report shows last time beside this time for that person, with last time showing them stuck. What this time shows is recorded, not scored.

## Reading

The builder opens the planted Q1 report and, without scrolling past "change these first", says the question, the answer and the first change. Passes when all three are right. Recorded the same day.

## Cost

Total USD per run from the stream's result line, plus turns and tokens per role (coordinator, each person, verifier, others) computed from the same stream.
