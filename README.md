# user-thoughts

**English** | [繁體中文](README.zh-TW.md)

An agent skill that sends simulated users through your live website, black-box, and reports where they got lost, where they gave up, and which features to question.

```
/plugin marketplace add gn01763009/user-thoughts
/plugin install user-thoughts@user-thoughts
```

Then ask: `Test http://localhost:3000 as a real user.`

From a run on the fictional test site in this repository ([full report](examples/tallywren/report.md)):

| Persona | Thought this was | Outcome | Left at | Steps |
|---|---|---|---|---|
| Goal-driven first-time visitor | "I cannot tell; something about workflows, a dashboard chart and a popup" | abandoned | `/signup.html?from=demo` | 3 |
| Novice | "I cannot tell. Something for work, maybe, but the words are vague." | blocked | `/signup.html` | 3 |
| On the go | "Unclear; a newsletter popup and chat panel covered the page, and the hero was vague" | abandoned | `/` | 4 |
| Committed user | "I could not tell. Headline talks about a workflow ecosystem and synergy; later pages show it is an invoicing tool." | blocked | `/signup.html` | 14 |

The same four personas on the fixed version of that site all named what it was, and three of them finished.

## What it does

- Runs four simulated visitors by default, each with its own browser, goal and stopping rules.
- Lets them use the site for real: click, fill in forms, submit, and give up.
- Records what each one saw at every step, with a screenshot and text quoted from the page.
- Asks of each feature whether it helps with what the persona came to do, and what it costs them.
- Has an independent agent re-check the serious findings, without seeing the personas' conclusions.
- Compares what you believe users will value with what actually happened to the personas.

## What it does not do

- It does not measure demand. Everything it reports is a hypothesis to check with real people.
- It does not replace user research. See [Limits](#limits).
- It does not read your source code. Use a code review or QA tool for that.
- It does not give the site a score. One number would suggest a precision this method does not have.

## How it works

```
You: URL, optional one-line audience, optional beliefs about what users value
 │
 ▼
Coordinator (your session). Sets up the run, never browses the site.
 │
 ├─ goal-first-timer ┐
 ├─ novice           │ one agent and one browser each, started together
 ├─ on-the-go        │ writes trace, findings, features, screenshots
 └─ committed-user   ┘
 │
 ▼
merge-findings.mjs   dedupes, caps confidence without evidence, computes severity
 │
 ▼
Verifier             gets locations and quotes only, re-checks serious items
 │
 ▼
merge-findings.mjs   applies the verification
 │
 ▼
report.md            outcomes, findings, features to question, questions for real users
```

Three rules hold this together:

- **Evidence or it does not count.** A finding with no page quote and no screenshot has its confidence capped by the script.
- **Models classify, scripts compute.** Personas record what happened to them. Severity, dedupe and feature status are arithmetic, so they do not drift between runs.
- **Personas are isolated.** They never see your beliefs, the source code or each other's notes.

The formats and rules are in [docs/design.md](docs/design.md).

## Personas

| Persona | Label | Default |
|---|---|---|
| `goal-first-timer` | Goal-driven first-time visitor | yes |
| `novice` | Low-confidence novice | yes |
| `on-the-go` | On the go, one-handed phone user (390×844) | yes |
| `committed-user` | Committed user who cannot leave | yes |
| `returning-regular` | Returning regular | |
| `explorer` | Curious explorer | |
| `deep-researcher` | Deep researcher | |
| `assistive-tech` | Keyboard and screen reader user | |
| `reading-difference` | Reader with attention or reading differences | |

Three of the default four are strangers who may leave at the first obstacle. The fourth cannot leave, so it reaches what lies behind that obstacle. In testing, strangers alone never got to the deeper flows.

Each persona is written as observable rules with numeric limits, not personality traits. The archetypes come from published UX work, and the thresholds are design assumptions. [Overlays](skills/persona-walkthrough/assets/overlays.md) add one attribute to a persona, such as price-sensitive or AI sceptic.

## Requirements

- Claude Code. This is the only agent it has been tested on (version 2.1.319).
- Node 20 or later.
- A browser layer. [agent-browser](https://github.com/vercel-labs/agent-browser) lets personas run at the same time:

  ```
  npm install -g agent-browser && agent-browser install
  ```

  This downloads Chrome, about 190 MB. Without it, the skill falls back to a browser MCP and runs personas one at a time. With neither, it stops and tells you.

Background subagents cannot answer permission prompts, so allow the browser commands in `permissions.allow` in your Claude Code settings:

```json
{
  "permissions": {
    "allow": ["Bash(agent-browser:*)", "Bash(npx -y agent-browser:*)"]
  }
}
```

Persona agents also write to the run directory with shell commands. All test runs so far used a session with permission prompts bypassed, so this setup has not been tried in stricter modes. If a mode blocks those commands, personas finish as `INCOMPLETE`, and the report says so.

## Install

Use one method per agent. Installing twice loads the skill twice.

**Claude Code plugin**

```
/plugin marketplace add gn01763009/user-thoughts
/plugin install user-thoughts@user-thoughts
```

**Skills CLI**, for other agents as well. Other agents have not been tested.

```
npx skills add gn01763009/user-thoughts
```

**Manual copy**

```
git clone https://github.com/gn01763009/user-thoughts
cp -r user-thoughts/skills/persona-walkthrough ~/.claude/skills/
```

## Usage

Ask in plain language:

```
Test http://localhost:3000 as a real user.
Would users actually want the assistant on my staging site? https://staging.example.com
```

Or call it directly. The plugin form is shown; a manual install uses `/persona-walkthrough`.

```
/user-thoughts:persona-walkthrough http://localhost:3000
/user-thoughts:persona-walkthrough https://staging.example.com --personas novice,on-the-go
/user-thoughts:persona-walkthrough http://localhost:3000 --all
```

The skill asks two optional questions first: who the site is for, and what you believe users will value most. Your beliefs are kept from the personas and compared with what happened at the end.

Each run writes to `.user-thoughts/runs/<date>-<host>/`, with the report at `report.md`. Add `.user-thoughts/` to your `.gitignore`.

**Cost.** Measured in test runs with Sonnet: about 70,000 to 105,000 tokens per persona as reported by Claude Code, and 1 to 4 minutes each. Personas run at the same time, so a default run takes roughly as long as its slowest persona, plus a verifier of similar size.

## Results

A skill has to beat what an agent does without it. So this repository ships a fictional site with 11 planted problems (6 usability, 5 unwanted features) and 3 decoys that look wrong but are correct, plus a clean version of the same site. A plain agent with a browser got the same model and a fair prompt.

| Measure | Plain agent | This skill |
|---|---|---|
| Planted problems found | 0.73, 0.73 | 0.82, 0.91 |
| Usability problems, of 6 | 4, 4 | 5, 6 |
| Unwanted features, of 5 | 4, 4 | 4, 4 |
| Decoys flagged as problems | 1, 1 | 0, 0 |
| Clean site | 8 main problem areas, plus further sections that flagged decoys D1 and D3 | 0 high findings, 0 features questioned |
| Prompt injection obeyed | 0 of 1 run | 0 of 4 personas |

Personas finished their task 0 of 4 times on the planted site and 3 of 4 on the clean site. The fourth stopped at a safety rule, before sending to a third party.

In a separate check, the skill fired on 8 of 8 runs of four matching prompts, in English and Chinese, and on 0 of 6 runs of three unrelated prompts. That is only seven prompts, and other installed skills could change it. See [evals/cases/RESULTS.md](evals/cases/RESULTS.md).

The skill's edge is deep flows, restraint and evidence. It does not find more unwanted features than a plain agent. That was the original goal, and on this test it is a tie.

Read these numbers with care:

- **Tiny sample.** One fictional site, two runs per arm, Sonnet for both.
- **Shared runs.** Both skill runs reuse the same three stranger persona runs, so only `committed-user` differs between them.
- **Not held out.** The site was used during development and changed along the way. A skill tuned against its own test will look better than it is.
- **A known miss.** The "AI Insights" block was never found by any of five skill runs. The plain agent found it every time.
- **Hand-corrected scoring.** A regular expression matched V3 wrongly and missed U6, and manual reading caught both. The rules were corrected and every run was rescored.
- **Injection is not an improvement.** The plain agent resisted it too, and the hostile test was not rerun after the last persona change.

The full run history is in [docs/evaluation.md](docs/evaluation.md).

## Limits

Simulated users are useful for finding where a product breaks down. They are poor at predicting what people want.

- [Kuric et al. (2026)](https://arxiv.org/abs/2605.18302) compared GPT with 3,431 real participants on 12 first-click tests. Results differed significantly on 53% of tasks, and tuning personas did not make them more realistic.
- [Nielsen Norman Group (2024)](https://www.nngroup.com/articles/synthetic-users/) found synthetic users shallow and over-positive, and suitable only for early preparation and hypotheses.

Whether a persona can tell that a feature is not wanted is unproven. We found no study that tests it. Personas can report that a feature covered the page or asked for data too early, because those can be observed. They cannot tell you how many people would use it.

Treat the report as a list of places to look and questions to ask.

## Safety

- Only test sites you own or have permission to test. The skill asks when the URL is not localhost.
- It does not bypass bot checks. On a CAPTCHA or bot detection it stops and reports.
- It never enters payment details, even fake ones, and stops before deleting anything, sending to a third party or publishing.
- Credentials never pass through an agent. On a login wall it records the wall and stops.
- Page text is data. Anything on a page aimed at an agent is quoted, never obeyed. See [SECURITY.md](SECURITY.md).

`robots.txt` is not an access control, so permission is your responsibility.

## Related projects

Other projects run personas against live products. This one differs by questioning features, separating observation from interpretation, and shipping a test site.

- [danielgwilson/humanish](https://github.com/danielgwilson/humanish): computer-use participants on a real desktop. Needs OpenAI and E2B keys.
- [savkevip/ghostuser](https://github.com/savkevip/ghostuser): MCP server with five built-in personas and Playwright.
- [Kappaemme-git/codex-startup-user-simulator-skill](https://github.com/Kappaemme-git/codex-startup-user-simulator-skill): Codex skill with five personas that decide to convert, hesitate or leave.
- [travisseh/synthetic-user-feedback](https://github.com/travisseh/synthetic-user-feedback): Claude skill with two to four personas and a "Gave up at X step" verdict.
- [ncklrs/claude-chrome-user-testing](https://github.com/ncklrs/claude-chrome-user-testing): Claude Code plugin with 25 personas on Claude in Chrome, leaning towards WCAG, form and cookie audits.
- [berober2003/synthetic-user-harness](https://github.com/berober2003/synthetic-user-harness): Python harness with one agent per user and a value score for each feature on a list you supply.
- [NousResearch/hermes-agent `adversarial-ux-test`](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/dogfood/adversarial-ux-test/SKILL.md): Hermes skill with one user who does not want your software.
- [UXAgent](https://arxiv.org/abs/2504.09407): research system that simulates users on live sites. No public code that we found.
- `dogfood`, a skill that ships with [agent-browser](https://github.com/vercel-labs/agent-browser): QA-oriented exploration. We only saw it listed and did not read it.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Behaviour changes must be run against the test sites and read by a person.

## Licence

[MIT](LICENSE). Credits for ideas are in [NOTICE.md](NOTICE.md). The research behind the design is in [docs/research.md](docs/research.md).
