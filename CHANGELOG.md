# Changelog

## Unreleased

- Marks what the test setup may have caused (`test_limits`), so the report separates those steps from real findings.
- Says who to ask and what to ask for the biggest findings (`real_checks`), as questions about past behaviour.
- Remembers what the builder decided to keep (`decided`), so the next report does not raise it again.
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
- Evaluation: on the known test site v1 reached 9/11 as scored but at most 8/11 and 7/11 when read by hand, so the 9/11 bar was not met and v1 was accepted with it unmet; an unseen site scored 0.91 and 0.64 against 0.55 for one blind run of a plain agent, and the bad-idea check could not be validated. See [docs/evaluation.md](docs/evaluation.md). The last full run of this release scored 8/11 with one decoy false alarm.

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
