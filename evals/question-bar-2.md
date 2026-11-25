# Bar 2: answering the builder's question, after the verifier fix

Written and committed before any run below, after `evals/question-bar.md` (first attempt). That attempt's answers passed 4 of 4, but its change bar failed on both planted runs because the verifier stopped at its first command (`--help`), so nothing was confirmed. The verifier protocol now names its commands (commit 81dd8b9). Per the first bar, the same two questions are not reused: this bar uses two new ones.

## What is tested

Same sites (planted has known problems, clean has them fixed), same setup as the first bar: quick depth, Sonnet, unattended, every setup answer in the request (zh-TW), one run per arm, four arms.

| Question (asked in zh-TW, word for word) | Known problems |
|---|---|
| Q3 「改完之後，第一次來的人一打開首頁就能直接看內容，不會被跳出來的東西擋住嗎？」 | V1 and V2 in `ground-truth/planted.json` |
| Q4 「用手機的人找得到網站的選單嗎？」 | U6 in `ground-truth/planted.json` |

## Pass rules: answers

- **Planted Q3 passes** when `question.answer` is `does_not_hold` or `partly`, and the report shows at least one break whose step's route path is `/` or `/index.html`.
- **Planted Q4 passes** when the answer is `does_not_hold` or `partly`, and the report shows at least one break by a person whose card's `base` is `on-the-go` (the phone visitor, 390x844), at any route.
- **Clean passes** when the answer is not `does_not_hold`.
- **Counts as a fail on either site:** `not_reached`, an answer the report shows as bad evidence, or no answer.
- All four pass only if each passes. Otherwise report raw results and do not say "passed". No tuning and rerunning on Q3 or Q4.

## Pass rules: verification and changes (regex, not a person's reading)

- **Verification ran** in a run when `verification.jsonl` has at least one line whose status is `confirmed` or `not_reproduced`. Reported for all four runs. A planted run where it did not run fails its change rule.
- For each change kept in the report, the text matched is the change sentence plus the `interpretation` of every source of the finding it cites in `merged.json`, against the problem's `all_of` groups as `evals/score.mjs` reads them.
- **Planted Q3:** at least one kept change matches V1 or V2. **Planted Q4:** at least one kept change matches U6.
- **Clean Q3:** no kept change matches V1 or V2. **Clean Q4:** no kept change matches U6.
- Reported alongside, not scored: changes written, kept, and dropped because their finding was not `confirmed`; confirmed findings per run.

## Not repeated here

The rerun and reading checks belong to the first bar.

## Cost

Total USD per run from the stream's result line, plus turns and cache reads per role from the same stream.
