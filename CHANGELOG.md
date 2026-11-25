# Changelog

## Unreleased

- The person protocol now names the browser commands a simulated person needs and says never to run `--help`. In a run from the installed 1.2.0, one person's first command was `--help`; it was refused and the person carried on only because the refusal listed the allowed commands. A test runs every listed command through the browser script, for both the person and the verifier protocols.

## 1.2.0 (2026-11-26)

- Asks the builder what they just changed and what they hope is true now, and opens the report with that question, the answer (holds, partly holds, does not hold, or nobody reached what changed) and where it broke. Up to three changes to make first follow, each one a problem the verifier confirmed on the page. Everything else is folded below. Runs without a question keep the old report.
- New runs no longer ask for the hidden assumption. Setup asks the question again on a reused setup, offering the saved one as the default, and writes a default question from the main task when skipped.
- `summary.md` opens with the question and the answer when there is one, and stays at 8 lines or fewer.
- `run.json` gains `question` and `question_default`, and `judgements.json` gains `question` and `changes`. An answer is shown only when real steps back it, and a change only when its finding was confirmed.
- Keeps what each person expected and saw at each step (`expected`, `saw`) and their `arrival`, and shows them beside the break.
- The lint checks that the question never reaches a person's, the reader's or the verifier's brief.
- Runs the question bars on the local test sites, not a real site, and summarises the results in the README's Results section.
- Fixes the verifier stopping before it checked anything: its protocol never named the browser commands, so it asked for `--help`, which is refused, and a refusal ends its check. The protocol now lists its commands, and a test runs each through the browser script.
- People write `expected` and `saw` in the run's language.
- Fixes a crash when `merged.json` holds an entry in `findings` that is not an object, such as `null`.
- In the question layout, the overview folds together with each person's section, so its row links work in any browser.

## 1.1.0 (2026-11-10)

- Opens the report with a line saying it is one run, a sample and not a ranking of the most important problems. On one real site, most of a run's top findings did not come back in other runs. The summary now says "one problem from this run" instead of "top finding".
- Shows features in question in the report, with each person's own words on what would change if the feature went away.
- The verifier now only adds a note. It no longer moves a finding or changes a feature's status, because it checks one page and demoted true problems that appear after a click.
- The content reader's section always says how many pages were read and what was found. A missing, malformed or over-limit result is listed under "not checked".
- Stricter checks on the coordinator's judgements: cited steps that do not exist show as "could not be confirmed", real checks refuse intent questions and simulated names, and one step cannot support both sides of a conflict.
- Fixes a crash in the report builder when a finding's step had been dropped.
- Planted and hostile scores are now computed on `report.html`, the file the builder reads. Earlier tables used `merged.json` and are not comparable.
- Marks what the test setup may have caused (`test_limits`), so the report separates those steps from real findings.
- Says who to ask and what to ask for the biggest findings (`real_checks`), as questions about past behaviour.
- Remembers what the builder decided to keep (`decided`), so the report shows it in its own section and it no longer competes for the top finding.
- Adds a content reader, one more agent who plays nobody and lists where the site's own content disagrees with itself (contradictions, stale dates, sums that do not add up), with quotes, in its own report section.
- Adds a sixth person for whom the product barely matters (`low-stakes`), so standard depth is now 6 people and full is 9.

## 1.0.0 (2026-11-09)

A rewrite around one skill and one person-by-person report.

- Removed `slop-check`, along with its test site, scoring mode and trigger cases.
- Renamed `persona-walkthrough` to `launch`, now the only skill: `/user-thoughts:launch <url> [--depth quick|standard|full] [--rerun <person-id>]`.
- Setup reads the product and states its understanding, asks the vision and a hidden assumption, chooses a depth (quick 3 people, standard 5, full 8), recommends people, and remembers the setup in `.user-thoughts/`.
- Output is now `report.html`, a quiet page: what each person would tell a friend, then a section per person with a short introduction, the moment that mattered most with its screenshot, and the full visit on request. Plus a 5 to 8 line `summary.md`. There is still no overall score.
- New mechanisms: one-visit people with an exit interview, the evidence rule, the bad-idea check (experimental), the word-of-mouth chain, launch-day comments (full depth), and re-run after a fix.
- People have a short introduction (`facts`, `about`, `cares`) and their own `voice`, and their thoughts are what they would say at that moment.
- Permission rules changed: the `Read` rule and three `node` rules now name the skill's absolute folder, replacing the tilde `Read` rule and the wildcard-folder `node` rule, because a wildcard folder could let a web page steer an agent into running a script it wrote. Agents reach the browser only through `scripts/browser.mjs`, which allows a fixed list of commands. See the README.
- Evaluation: on the known test site v1 reached 9/11 as scored but at most 8/11 and 7/11 when read by an AI agent, so the 9/11 bar was not met and v1 was accepted with it unmet; an unseen site scored 0.91 and 0.64 against 0.55 for one blind run of a plain agent, and the bad-idea check could not be validated. See [docs/evaluation.md](docs/evaluation.md). The last full run of this release scored 8/11 with one decoy false alarm.

## 0.2.1 (2026-11-07)

Both skills failed under normal permissions, because every earlier test had bypassed them.

- `slop-check`: the reviewer protocol moved into `SKILL.md`, and the reviewer runs one browser command per call.
- `persona-walkthrough`: agents write with file tools and need no shell beyond the browser and the merge script.
- README lists the exact permission rules for each skill.
- `slop-check`: a fix must make the claim true, and an item appears in one section only.

## 0.2.0 (2026-11-06)

- `slop-check` skill: a fresh reviewer asks why each thing exists, using a Rebuild step and six tests, and may only delete with a fact.
- Test site `evals/fixtures/slop/` with 8 planted problems and 5 decoys, plus `--mode slop` and `--mode slop-clean` in the scorer.
- Trigger cases for `slop-check`.
- `persona-walkthrough` README states what has not been run.

## 0.1.0 (2026-11-06)

First release.

- `persona-walkthrough` skill: coordinator, persona protocol and verifier protocol.
- Nine personas, four of them in the default run, plus overlays.
- `merge-findings.mjs`: evidence gate, dedupe, computed severity, feature status, give-up audit.
- Report template, including a comparison of builder beliefs with what happened.
- Test sites with planted problems, a clean control and a hostile page, plus a scorer.
- Example report on the fictional Tallywren site.

Tested on Claude Code only, with Sonnet, on one fictional site. See [docs/evaluation.md](docs/evaluation.md).
