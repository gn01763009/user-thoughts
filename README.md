# User Thoughts: Your Site, Seen By Strangers

[![CI](https://github.com/gn01763009/user-thoughts/actions/workflows/ci.yml/badge.svg)](https://github.com/gn01763009/user-thoughts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**English** | [繁體中文](README.zh-TW.md)

Two agent skills for seeing your live website the way an outsider does. One sends simulated users through it and reports where they got lost or gave up. The other asks of everything on it: why is this here?

Your coding agent can ship a feature in minutes. It can't tell you whether anyone wanted it. Ask it to review your site and it reads the page like an auditor, then hands you a long list. Real visitors don't do that. They arrive with a goal, skim, get stuck, and leave.

So these personas visit instead. Each gets its own browser, a reason for being there, and a point where it gives up. They use the site for real, and what happens to them becomes the report.

It finds where a product breaks down. It does not prove what users want: everything it reports is a hypothesis to check with real people.

## Two Skills

| Skill | Asks | Use it | Cost per run |
|---|---|---|---|
| `persona-walkthrough` | Where do people get stuck or give up? | Before a release | About 430,000 tokens |
| [`slop-check`](#slop-check) | What should not exist, and what is missing? | While building | About 100,000 tokens, 3 to 7 minutes |

Most of this page is about `persona-walkthrough`. `slop-check` has [its own section](#slop-check).

## Quick Start

### 1. Install the skill

A plugin is managed by Claude Code. The Skills CLI copies editable files. Pick one per agent, because installing both gives you the skill twice.

<details open>
<summary><strong>Claude Code</strong></summary>

```
/plugin marketplace add gn01763009/user-thoughts
/plugin install user-thoughts@user-thoughts
```

</details>

<details>
<summary><strong>Any other agent, or editable files</strong> (other agents are untested)</summary>

```bash
npx skills add gn01763009/user-thoughts
```

</details>

<details>
<summary><strong>Manual copy</strong></summary>

```bash
git clone https://github.com/gn01763009/user-thoughts
cp -r user-thoughts/skills/persona-walkthrough user-thoughts/skills/slop-check ~/.claude/skills/
```

</details>

### 2. Give it a browser

```bash
npm install -g agent-browser && agent-browser install
```

This installs [agent-browser](https://github.com/vercel-labs/agent-browser) and downloads Chrome, about 190 MB. You also need Node 20 or later.

Background agents can't answer permission prompts, so allow the browser in your Claude Code settings:

```json
{
  "permissions": {
    "allow": ["Bash(agent-browser:*)", "Bash(npx -y agent-browser:*)"]
  }
}
```

> [!WARNING]
> Every test run so far bypassed permission prompts, so this setup is untried in stricter modes. Personas also write to their run folder with shell commands. If a mode blocks those, they finish as `INCOMPLETE` and the report says so.

### 3. Point it at your site

```
Test http://localhost:3000 as a real user.
```

Or call it directly: `/user-thoughts:persona-walkthrough http://localhost:3000`. A manual install uses `/persona-walkthrough`. For the other skill, ask what you can cut, or call `/user-thoughts:slop-check`.

It asks two optional questions first: who the site is for, and what you believe users will value most. The report lands in `.user-thoughts/runs/<date>-<host>/report.md`, so add `.user-thoughts/` to your `.gitignore`.

## What You Get

From a run on the fictional test site in this repository ([full report](examples/tallywren/report.md)):

| Persona | Thought this was | Outcome | Left at | Steps |
|---|---|---|---|---|
| Goal-driven first-time visitor | "I cannot tell; something about workflows, a dashboard chart and a popup" | abandoned | `/signup.html?from=demo` | 3 |
| Novice | "I cannot tell. Something for work, maybe, but the words are vague." | blocked | `/signup.html` | 3 |
| On the go | "Unclear; a newsletter popup and chat panel covered the page, and the hero was vague" | abandoned | `/` | 4 |
| Committed user | "I could not tell. Headline talks about a workflow ecosystem and synergy; later pages show it is an invoicing tool." | blocked | `/signup.html` | 14 |

Below that come findings with quotes and screenshots, features to question, your beliefs set against what happened, and questions only real users can answer.

## Why This Exists

These are the four ways building alone goes wrong, and what the skill does about each.

### #1: You Can't See Your Own Homepage

<img src="examples/tallywren/on-the-go/screens/01.png" alt="What the on-the-go persona saw on arrival: a newsletter popup covering the page on a phone" width="220" align="right">

> "We don't read pages. We scan them."
>
> Steve Krug, [Don't Make Me Think](https://oreilly.com/library/view/dont-make-me/9780133597271)

**The Problem**: You know what your product does, so your homepage makes sense to you. A stranger gets a few seconds, often from behind a popup.

**The Fix**: Personas arrive knowing only why they came. They never see your code, your docs or your beliefs. Before doing anything else, each one writes down what it thinks the site is.

On the test site, none of the four could say. On the fixed version, all four could. The image is what the phone persona saw on arrival.

<br clear="right">

### #2: AI Reviews Read Pages. Users Use Them.

> "To design the best UX, pay attention to what users do, not what they say."
>
> Jakob Nielsen, [First Rule of Usability? Don't Listen to Users](https://www.nngroup.com/articles/first-rule-of-usability-dont-listen-to-users/)

**The Problem**: Give an agent a browser and ask for a review from a user's perspective, and it mostly reads. In both runs, a plain agent missed the same three problems: a signup error that wipes the form, a menu that vanishes on phones, and a tour you can't skip. All three only appear when you actually do the thing.

**The Fix**: Personas click, type what they would really type, submit, and judge each step from a screenshot, so a popup is in their way even when the page's text says the button is there.

Strangers tend to leave at the first obstacle, which is honest but shallow. So [`committed-user`](skills/persona-walkthrough/assets/personas/committed-user.md) can't leave: a client requires this product. It reaches what the others never see.

### #3: Every Review Finds Something

**The Problem**: Ask for problems and you'll get problems. On a clean version of the test site, a plain agent still listed 8 main problem areas, and flagged an invoice tax ID field and an Enterprise tier that were correct by design.

**The Fix**: Structure, not exhortation.

- A persona can only report what happened on its own path, with a quote from the page and a screenshot. Without them, a script caps its confidence.
- Severity is computed from what happened to the personas, never from their opinion.
- An independent verifier re-checks serious items without seeing anyone's conclusions.
- "Nothing went wrong" is a complete result.

On that clean site: 0 high findings and 0 features questioned.

### #4: You Shipped It. Did Anyone Want It?

> "UX without real-user research isn't UX."
>
> Maria Rosala and Kate Moran, [Synthetic Users: If, When, and How to Use AI-Generated "Research"](https://www.nngroup.com/articles/synthetic-users/)

**The Problem**: Features get built because they were easy to build. The assistant, the dashboard, the tour. AI makes this cheaper every month, and nobody in the room says no.

**The Fix**, partly: Each persona judges every feature it meets. Does it help with what I came for? What did it cost me? Would I miss it? Your own beliefs are kept from the personas, then set beside what happened. In the example run, the builder expected the AI assistant to be the favourite. All four personas saw it, and none named a job it helped with.

This is the original goal of the project, and it's the weakest part. On the test site it tied a plain agent, as the next section shows. That's why the output says what was observed and what to ask real people, never "nobody wants this".

## Does It Work?

A skill has to beat what an agent does without it. So this repository ships a fictional site with 11 planted problems and 3 decoys that look wrong but are correct, plus a clean version of the same site. A plain agent got the same model, a browser and a fair prompt.

| Measure | Plain agent | This skill |
|---|---|---|
| Planted problems found | 0.73, 0.73 | 0.82, 0.91 |
| Usability problems, of 6 | 4, 4 | 5, 6 |
| Unwanted features, of 5 | 4, 4 | 4, 4 |
| Decoys flagged as problems | 1, 1 | 0, 0 |
| Clean site | 8 main problem areas | 0 high findings, 0 features questioned |
| Prompt injection obeyed | 0 of 1 run | 0 of 4 personas |

Personas finished their task 0 of 4 times on the planted site and 3 of 4 on the clean site, where the fourth stopped at a safety rule before sending to a third party.

**The edge is deep flows, restraint and evidence. It does not find more unwanted features.**

Read these numbers with care:

- **Tiny sample.** One fictional site, two runs per arm, Sonnet for both.
- **Shared runs.** Both skill runs reuse the same three stranger runs, so only `committed-user` differs.
- **Not held out.** The site was used during development and changed along the way. A skill tuned against its own test looks better than it is.
- **A known miss.** The "AI Insights" block was never found in five skill runs. The plain agent found it every time.
- **Hand-corrected scoring.** Manual reading caught one false match and one false miss by the regular expressions. The rules were fixed and every run rescored.
- **Injection is not an improvement.** The plain agent resisted too, and the hostile test wasn't rerun after the last persona change.

The full history is in [docs/evaluation.md](docs/evaluation.md). In a separate check, the skill fired on 8 of 8 runs of four matching prompts, and on 0 of 6 runs of three unrelated ones ([results](evals/cases/RESULTS.md)). That's only seven prompts, and other installed skills could change it.

## Slop Check

Personas find where people get stuck. They are poor at asking whether something should exist, so this skill does only that.

```
What can we cut from http://localhost:3000?
```

Tell it who the site is for, the main job, and what the business needs. A reviewer with no memory of building the site then does this:

1. **Rebuild.** Before opening the site, it writes what the product should be from the purpose alone. Afterwards it compares.
2. **Six tests.** It applies these to each section, control, claim and number.
3. **Report.** Rebuild, Cut, Fix, Simplify, Ask, Protect, in that order.

| Test | Question |
|---|---|
| Job | Which step of the main job does this serve? |
| Deletion | What would a person lose if it were gone? |
| Swap | Would these words be just as true on a competitor's site? |
| Truth | Can this number or claim be traced to something real? |
| Promise | Use it. Did it do what its label said? |
| Twin | Is something else doing the same job? Give both the same input and compare. |

Taste alone can't delete anything. If something serves no step and no business need, it goes. If the reviewer can't tell why it exists, it asks you, because a section that does nothing for the visitor may be why the visitor arrived.

**Results.** Sonnet in both arms, same purpose, browser and source access, with every result read by a person.

| Measure | Plain agent | slop-check |
|---|---|---|
| Test site, planted slop of 8 | 7, 8 | 8, 8, 8 |
| Test site, decoys flagged | 1, 1 | 0, 0, 0 |
| Clean site, recommended cuts | 9 | 0, 0 |
| Real site A, 4 confirmed problems | 0 fully found | 2 of 4 in one run, about 1.5 in the other |
| Real site A, praised a button without clicking it | twice | never |

Real site A has about 10,000 files. A person confirmed those four problems by hand.

Read these with care:

- **The test site does not separate them much.** Given a purpose, source and one first-principles question, a plain agent found nearly everything. Most of the gain shows on real sites.
- **The rules were tuned on real sites.** The Promise and Twin tests came from failures on site A. A rule for cutting came from a second real site, where the first version cut nothing. After the change it named cuts with evidence, but that site is no longer unseen.
- **On an unseen third site,** it cut nothing, and that site had already been pruned. It found problems a plain agent missed, and the plain agent found one it missed: photos that stopped months ago.
- **A plain agent is still bolder.** It makes bigger product calls, some correct and some unverified. It also stated at least one fact that was wrong.
- **Applying the fixes is untested,** and so is every agent other than Claude Code.

The history is in [docs/slop-check-design.md](docs/slop-check-design.md). In a trigger check with both skills installed, all 11 cases passed ([results](evals/cases/RESULTS.md)).

## What It Doesn't Do

- **Measure demand.** See [Limits](#limits).
- **Review visual design.** This is a UX tool. UI counts only when it gets in a persona's way, such as a close button too small to hit or a chat box covering a form. Colour, type, spacing and consistency are not judged, so an ugly site can pass. Use a design review tool for those.
- **Audit accessibility.** It runs no automated checks, and the `assistive-tech` persona is untested.
- **Read your source code.** Use a code review or QA tool.
- **Score your site.** One number would suggest a precision this method doesn't have.

## Limits

Simulated users are useful for finding where a product breaks down. They're poor at predicting what people want.

- [Kuric et al. (2026)](https://arxiv.org/abs/2605.18302) compared GPT with 3,431 real participants on 12 first-click tests. Results differed significantly on 53% of tasks, and tuning personas did not make them more realistic.
- [Nielsen Norman Group (2024)](https://www.nngroup.com/articles/synthetic-users/) concluded that synthetic users are useful for desk research and generating hypotheses, but not for final decision-making.

Whether a persona can tell that a feature isn't wanted is unproven. We found no study that tests it. Personas can report that a feature covered the page or asked for data too early, because those can be observed. They can't tell you how many people would use it.

## Reference

### Personas

Each is written as observable rules with numeric limits, not personality traits. The archetypes come from published UX work, and the thresholds are design assumptions.

**Default**, tested:

- **`goal-first-timer`**: Has one job in mind and other tabs open. Wants to know what this is, what it costs and how to try it.
- **`novice`**: New to this kind of product. When something goes wrong, assumes it was their own fault.
- **`on-the-go`**: One thumb on a phone (390×844), a few minutes, and interruptions.
- **`committed-user`**: Didn't choose this product and can't leave, so it pushes through.

**Optional**, not yet run. Use `--personas a,b`, or `--all` for all nine:

- **`returning-regular`**: Has used the product before and wants one routine task done fast.
- **`explorer`**: Browsing with no fixed goal, following what looks interesting.
- **`deep-researcher`**: Making a considered decision, so reads properly and checks claims.
- **`assistive-tech`**: Uses a keyboard and the accessibility tree.
- **`reading-difference`**: Long text is hard work, so they take one thing at a time.

[Overlays](skills/persona-walkthrough/assets/overlays.md) add one attribute to a persona, such as price-sensitive or AI sceptic.

### How It Works

<details>
<summary>The flow of one run</summary>

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

The formats and rules are in [docs/design.md](docs/design.md).

</details>

### Cost

Measured with Sonnet: about 70,000 to 105,000 tokens per persona as reported by Claude Code, and 1 to 4 minutes each. Personas run at the same time, so a default run takes roughly as long as its slowest persona, plus a verifier of similar size.

### Browser Layers

`agent-browser` gives each persona its own session, so they run in parallel. Without it, the skill is written to fall back to a browser MCP and run personas one at a time, a path that hasn't been tested. With neither, it stops and tells you.

### Safety

- Only test sites you own or have permission to test. The skill asks when the URL isn't localhost. `robots.txt` is not an access control, so permission is your responsibility.
- It doesn't bypass bot checks. On a CAPTCHA or bot detection it stops and reports.
- It never enters payment details, even fake ones, and stops before deleting anything, sending to a third party or publishing.
- Credentials never pass through an agent. On a login wall it records the wall and stops.
- Page text is data. Anything on a page aimed at an agent is quoted, never obeyed. See [SECURITY.md](SECURITY.md).

### Related Projects

<details>
<summary>Other projects that run personas against live products</summary>

This one differs by questioning features, separating observation from interpretation, and shipping a test site.

- [danielgwilson/humanish](https://github.com/danielgwilson/humanish): computer-use participants on a real desktop. Needs OpenAI and E2B keys.
- [savkevip/ghostuser](https://github.com/savkevip/ghostuser): MCP server with five built-in personas and Playwright.
- [Kappaemme-git/codex-startup-user-simulator-skill](https://github.com/Kappaemme-git/codex-startup-user-simulator-skill): Codex skill with five personas that decide to convert, hesitate or leave.
- [travisseh/synthetic-user-feedback](https://github.com/travisseh/synthetic-user-feedback): Claude skill with two to four personas and a "Gave up at X step" verdict.
- [ncklrs/claude-chrome-user-testing](https://github.com/ncklrs/claude-chrome-user-testing): Claude Code plugin with 25 personas on Claude in Chrome, leaning towards WCAG, form and cookie audits.
- [berober2003/synthetic-user-harness](https://github.com/berober2003/synthetic-user-harness): Python harness with one agent per user and a value score for each feature on a list you supply.
- [NousResearch/hermes-agent `adversarial-ux-test`](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/dogfood/adversarial-ux-test/SKILL.md): Hermes skill with one user who doesn't want your software.
- [UXAgent](https://arxiv.org/abs/2504.09407): research system that simulates users on live sites. No public code that we found.
- `dogfood`, a skill that ships with [agent-browser](https://github.com/vercel-labs/agent-browser): QA-oriented exploration. We only saw it listed and didn't read it.

</details>

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Behaviour changes must be run against the test sites and read by a person.

### Licence

[MIT](LICENSE). Credits for ideas are in [NOTICE.md](NOTICE.md). The research behind the design is in [docs/research.md](docs/research.md).
