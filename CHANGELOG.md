# Changelog

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
