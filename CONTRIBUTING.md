# Contributing

Thanks for helping. This project cares more about whether a change works than whether it reads well, so changes to behaviour need evidence.

## Setup

Node 20 or later. There are no dependencies to install.

```
npm test
npm run lint
```

## Changing behaviour

Anything that changes what agents do counts as a behaviour change. That includes `SKILL.md`, the protocols, persona files and the report template.

1. Run the test sites before your change, to see the failure you want to fix.
2. Make the change.
3. Run them again on the same model, following [docs/evaluation.md](docs/evaluation.md).
4. Read every match the scorer prints, and the persona traces. A regular expression cannot tell praise from complaint, and it has been wrong in both directions here.
5. Put the before and after numbers in your pull request, including anything that got worse.

A single run proves little, because recall has moved by 0.18 between runs with nearly the same instructions. Include at least two runs on the planted site, and one on the clean site.

Say so plainly if you could not run them. An untested change can still be useful, but it should be labelled.

## Adding a persona

1. Add `skills/persona-walkthrough/assets/personas/<id>.md`. The file name must match `id`.
2. Fill in the frontmatter: `id`, `label`, `evidence`, `viewport`, `max_steps`, `no_progress_limit`, `leave_urge_limit`.
3. Describe behaviour as rules that can be observed, with numbers. "Leaves after three pages without an answer" works, and "impatient" does not.
4. In `evidence`, say where the archetype comes from and that thresholds are design assumptions unless you can cite a measurement. Never invent a citation.
5. Include only attributes that change behaviour on a page. A name or age adds nothing unless it does.
6. Add it to the tables in both READMEs.
7. Run it on the test sites, as above.

Before adding one, check whether an overlay in `assets/overlays.md` would do the job.

## Changing scripts

Write a failing test first, then the fix. Scripts use Node built-ins only. Keep functions small and do not mutate inputs. Bugs here have tended to sit between components, so add to `tests/integration.test.mjs` when a change crosses a boundary.

## Changing the test sites

- Nothing under `evals/fixtures/` may reveal that it is a test.
- The answers stay in `evals/ground-truth/`, outside every served directory.
- Apply shared behaviour to all three sites so they stay comparable.
- Record the change in [docs/evaluation.md](docs/evaluation.md), because changing a test can change every earlier result.

## Pull requests

Use a conventional commit style such as `fix: keep real routes in merged findings`. Both `README.md` and `README.zh-TW.md` should change together when user-facing behaviour changes.
