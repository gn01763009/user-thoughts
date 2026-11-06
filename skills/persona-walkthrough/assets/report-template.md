# Persona walkthrough: <site>

<date> · <url> · <N> personas · browser mode: <parallel or serial>

> These are simulated visitors, not real users. Treat everything below as hypotheses to check with real people. This run shows where the site broke down for these personas. It cannot measure how many people want or use anything.

**In one line:** <what happened, for example "2 of 3 personas left before finding the price">

## What happened to each persona

| Persona | Came for | Thought this was | Outcome | Left at | Why | Steps |
|---|---|---|---|---|---|---|
| <label> | <came_for> | <what_is_this> | <outcome> | <left_at> | <stop_reason> | <steps> |

<Add a line for anything from `overran_give_up` or `incomplete`. If every persona completed its goal, say that.>

## Findings

Severity is computed from what happened to the personas: `critical` stopped two or more, `high` stopped one, `medium` slowed one. Tentative findings have confidence 5 or 6.

### <severity>: <what happened, in one line>

- **Who:** <personas and their impact>
- **Where:** <route>, <element role and name>
- **Observed:** <observed, first person, from the source record>
- **On the page:** "<quote>"
- **Screenshot:** <run-relative path>
- **Possible meaning:** <interpretation>
- **Confidence:** <n>, <main or tentative> · **Verification:** <confirmed, not reproduced, unable, or not checked>

<Repeat for each main and tentative finding, in the order merged.json gives. If there are none, write "No findings in the main bands." and stop this section there.>

## Features to question

| Feature | Where | Noticed by | Not noticed by | Want / neutral / don't want | Costs seen | Status |
|---|---|---|---|---|---|---|

For each `question_it` or `split` feature:

**<feature>.** <what the personas did with it, and what `if_gone` said.> **Hypothesis:** <worded as something that might be true>. **Check with real users:** <a concrete question or a metric to look at>.

## Page content aimed at AI agents

<Include this section only when `injection_attempts` in `merged.json` is not empty. Leave it out otherwise.>

The pages held text addressed to AI agents. The personas recorded it and did not obey it. It is not counted
as a usability finding.

- <route>, <element role and name>: "<quote>" (<persona>)

## Builder beliefs against what happened

| You said | What the personas did |
|---|---|
| <line from builder-claims.md> | <what happened, or "not encountered"> |

<Leave this section out if the builder skipped the question.>

## Questions only real users can answer

1. <concrete question a researcher could ask, and who to ask>

## Appendix

- **Low confidence or missing evidence:** <appendix-band findings, one line each>
- **Not reproduced by the verifier:** <list>
- **Parse errors:** <list or none>
- **Run files:** <run directory>
