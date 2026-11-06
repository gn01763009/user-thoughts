# Trigger eval results

Date: 2026-11-06 (Claude Code 2.1.319, agent model: sonnet)

Validate: `claude plugin validate .` passed (one warning: no plugin icon).

Command:
`claude plugin eval . --runs 2 --ablation none --model sonnet --max-cost-usd 3 --no-publish --trust-plugin --json evals/cases/run1.json`

Setup: `experimental.evals` = `evals/cases` in .claude-plugin/plugin.json. Each case has max_turns 3, allowed_tools [Skill], and a `tool_used` grader on Skill matching `persona-walkthrough`. Must-not-trigger cases use `arm: both`, min 0, max 0. Run with `--ablation none` (with-plugin arm only) to halve cost.

| Case | Expected | Runs passed |
|---|---|---|
| trigger-test-as-user | trigger | 2/2 |
| trigger-ai-assistant-demand | trigger | 2/2 |
| trigger-zh-homepage | trigger | 2/2 |
| trigger-why-bounce | trigger | 2/2 |
| no-trigger-react-review | no trigger | 2/2 |
| no-trigger-unit-tests | no trigger | 2/2 |
| no-trigger-playwright-fix | no trigger | 2/2 |

Trigger recall: 8/8 runs. False triggers: 0/6 runs.
Cost: $0.54 (list-price estimate). Suite run once.
Description change: none (no misses).

Caveat: 2 runs per case, only 7 prompts, and only the first invocation is checked; this does not show the skill output is good.

## With both skills installed

Date: 2026-11-06, after `slop-check` was added. Same command and settings: 2 runs per case. Cost: $0.83.

| Case | Expected | Runs passed |
|---|---|---|
| no-trigger-playwright-fix | no trigger | 2/2 |
| no-trigger-react-review | no trigger | 2/2 |
| no-trigger-unit-tests | no trigger | 2/2 |
| slop-ai | trigger | 2/2 |
| slop-cut | trigger | 2/2 |
| slop-not-on-user-test | no trigger | 2/2 |
| slop-zh | trigger | 2/2 |
| trigger-ai-assistant-demand | trigger | 2/2 |
| trigger-test-as-user | trigger | 2/2 |
| trigger-why-bounce | trigger | 2/2 |
| trigger-zh-homepage | trigger | 2/2 |

`slop-*` cases check for `slop-check`. `slop-not-on-user-test` confirms a user-testing request does not fire it. Whether `persona-walkthrough` also fires on a `slop-*` prompt was not measured.
