# slop-check design

`slop-check` asks of every element in a product: why is this here? It runs while building, on a local URL and optionally the repository. It is the first-principles companion to `persona-walkthrough`. Personas find where people get stuck. `slop-check` finds what has no reason to exist.

Status: released in 0.2.0.

## What the baseline changed

The first design below had an inventory script and a coverage checker. A baseline run removed the case for both.

Given a stated purpose, the source and one first-principles question, a plain agent found 7 and 8 of 8 planted problems on the small test site. So a skill cannot add value there by finding more.

On a real project of about 10,000 files it failed differently. Against four problems a person had confirmed, it found none fully, in both runs:

- It praised the emergency button without clicking it. The button leads to a 34-minute article.
- It noticed two search boxes and never compared what they do.
- It missed an interrupting survey and contradictory counts, which need interaction to appear.
- It told the builder to delete SEO content, adoption and a paid plan without asking why they exist.

So the skill is one document with two new tests, Promise and Twin, and a rule that anything possibly serving the business with unknown needs becomes a question. The scripts were not built. Everything below the next heading is the earlier design, kept for the record, and its formats are superseded by `skills/slop-check/references/reviewer-protocol.md`.

## Results of the first version

Sonnet on both arms, with the same purpose, browser and source access. Every match was read by a person.

| Measure | Plain agent | slop-check |
|---|---|---|
| Test site, planted slop of 8 | 7, 8 | 8, 8 |
| Test site, decoys flagged | 1, 1 | 0, 0 |
| Clean site, recommended cuts | 9, including the Enterprise tier decoy | 0 |
| Clean site, things to fix | 12 | 6, each tried or traced in code |
| Real site, two search boxes behave differently | noticed the duplicate only, twice | shown fully once, partly once |
| Real site, emergency button leads to a long article | missed and praised, twice | found twice |
| Real site, interrupting survey | missed twice | missed twice |
| Real site, contradictory counts on a filter | missed twice | missed twice |
| Real site, direct `remove` calls on possible business features | several | 0, asked 8 and 7 questions instead |
| Injection canary hits | not run | 0 of 1 run |
| Tokens per run | about 82,000 to 93,000 | about 98,000 to 108,000 |
| Time per run on the real site | 1.5 to 2.5 minutes | 5 to 7.5 minutes |

Limits:

- The Promise and Twin tests were written after seeing these real-site failures, so finding those two problems is expected. This is not a held-out result.
- Two runs per arm, on one test site and one real site.
- "Cut: None" on the real site may be too cautious. With business needs stated, more `ask` items could become decisions. That has not been tested.
- The plain agent found real issues the skill did not, and the reverse. The fix counts are not a measure of accuracy.
- Trigger behaviour next to `persona-walkthrough` has not been tested.
- Applying the fixes has not been tested.

## What the second site changed

A second real site, not used for tuning, exposed the opposite failure. Even with business needs stated, the skill cut nothing, while the plain agent made useful calls about the product as a whole. So the rules changed in three ways:

- With business needs listed, an element that serves no step and no listed need is `remove`. `ask` is for unknown needs, taste, or changes to what the product is.
- The Rebuild step: before opening the site, write what the product should be from the purpose alone, then compare.
- Every review names the one thing it would cut first, or explains what it considered.

## Results of the current version

| Measure | Result |
|---|---|
| Test site | 8 of 8 planted slop found, 6 correct `remove` calls, no decoy flagged |
| Clean site | 0 `remove`, 4 `simplify`, 8 `fix` |
| Second real site, rerun | From "Cut: None" twice to named cuts with evidence twice, 1 and 2 `remove` verdicts. It was used for tuning, so this shows the change took effect and nothing more |
| Third real site, unseen | 0 `remove` twice on a site its own records show had already been pruned. Both runs found the empty journal through Rebuild, and each found mismatches a plain agent missed |
| Trigger check, both skills installed | 11 of 11 cases, 22 of 22 runs |

The plain agent stayed stronger in some ways on the third site. Both of its runs noticed that the photos had stopped months ago, which is a real weakness for a site whose job is giving fans a reason to return. Neither skill run did. It also makes bolder product calls, some of them unverified.

Not tested: applying the fixes, a stated purpose that is wrong, and any non-web product. Injection was tested on the first version only.

## Earlier design

## The idea

Most UI skills ask whether something looks like an AI default. This one asks whether it should be there at all, and the burden of proof is on the element.

Two lessons from the first real-site run shaped it:

- The most important finding was two identical-looking search boxes with different behaviour. No persona noticed, because each used only one of them. A mechanical comparison can find this.
- A block of meaningless metrics was never found, because agents do not look at the middle of a page. So coverage cannot be left to an LLM.

## Principles

1. **Purpose first.** Nothing can be judged until the builder has said who this is for and what job it does. If they cannot say, that is the first finding.
2. **Coverage is mechanical.** A script lists every element. Every listed element needs a verdict, and a script checks that none was skipped.
3. **Code proves, it does not judge.** Code can show that something is duplicated, unlinked, hard-coded or never read. It cannot show that something has no value.
4. **Judgement alone cannot delete.** A `remove` needs a code or page fact. Otherwise it becomes `ask`.
5. **Unknown is an allowed answer.** If nobody can say why something exists, it is marked `ask`, not `remove`, because it may solve a problem we cannot see.
6. **Say what is good.** Elements that serve the job well are named, so the builder knows what to protect.
7. **Fresh eyes.** The review runs in an agent with no memory of building the site, because a builder's agent justifies its own work.

## Flow

```
Purpose      who it is for, the main job, the steps of that job
   │
   ▼
Inventory    script: every page, every element, duplicates, stats
   │
   ▼
Code signals optional: hard-coded numbers, unlinked pages, unread settings
   │
   ▼
Four tests   per element: job, deletion, swap, truth
   │
   ▼
Coverage     script: every element has a verdict, rules applied
   │
   ▼
Report       keep, done well, simplify, remove, ask, in an order an agent can act on
```

## The four tests

| Test | Question | Fails when |
|---|---|---|
| Job | Which step of the job does this serve? | No step |
| Deletion | What breaks if this is removed? | Nothing a user would notice |
| Swap | Would this still be true on a competitor's site? | Yes, so it says nothing about this product |
| Truth | Can this number or claim be traced to something real? | Hard-coded, or unverifiable |

Protective friction passes the deletion test: a typed delete confirmation or a legally required field protects the user.

## Run directory

```
.user-thoughts/slop/<YYYYMMDD-HHMM>-<host>/
  purpose.md
  inventory.json
  verdicts.jsonl
  checked.json
  report.md
```

## `purpose.md`

```markdown
Who: freelancers who bill a few clients
Main job: send an invoice and get paid
Steps:
1. Understand what this is
2. See what it costs
3. Try it
4. Create and send an invoice
5. Get paid
```

## `inventory.json`

Written by `scripts/inventory.mjs <url> --out <file> [--max-pages 20]`.

```json
{
  "url": "http://localhost:4176/",
  "pages": ["/", "/pricing.html"],
  "elements": [
    {
      "id": "e12",
      "route": "/",
      "kind": "section",
      "label": "AI Insights",
      "text": "Synergy score 92. Momentum index +14%.",
      "shared": false
    }
  ],
  "duplicates": [
    {
      "kind": "same_name_controls",
      "route": "/",
      "label": "Search clinics",
      "ids": ["e3", "e20"],
      "detail": "2 controls with the same accessible name on one page"
    }
  ]
}
```

`kind` is one of `section`, `control`, `link`, `form`, `field`, `dialog`, `metric`, `claim`.

- Elements in a shared header, footer or navigation appear once, with `shared: true`.
- Text likely to be a number or claim gets its own `metric` or `claim` element.
- Dialogs and panels that appear within 4 seconds of load are captured.

`duplicates[].kind` is one of:

- `same_name_controls`: two or more controls with the same name or placeholder on one page
- `same_label_different_target`: one link label going to different places
- `same_target_different_label`: different labels going to the same place, on one page

## `verdicts.jsonl`

One line for each inventory element.

```json
{"id":"e12","route":"/","label":"AI Insights","verdict":"remove","serves":"none","if_removed":"Nothing a visitor needs is lost","swap":"pass","truth":"hardcoded","evidence_level":"code_fact","evidence":"index.html:88 hard-codes 92","reason":"The score comes from no data and supports no step of the job"}
```

| Field | Values |
|---|---|
| `verdict` | `done_well`, `keep`, `simplify`, `remove`, `ask` |
| `serves` | A step number from `purpose.md`, or `none` |
| `if_removed` | What would break, in plain words |
| `swap` | `pass`, `fail`, `n/a`. `fail` means it would be true anywhere |
| `truth` | `verified`, `unverifiable`, `hardcoded`, `n/a` |
| `evidence_level` | `code_fact`, `page_fact`, `judgement` |
| `evidence` | A quote from the page, or `file:line` |

Several elements that are one thing, such as a section and the metrics inside it, each get a line, and the same verdict is fine.

## Rules applied by `scripts/check-verdicts.mjs`

Input is a run directory. Output is `checked.json`, and a non-zero exit when coverage fails.

1. **Coverage.** Every inventory `id` needs a verdict. Missing ids are listed and the check fails.
2. **Judgement cannot delete.** `remove` with `evidence_level: judgement` becomes `ask`, with `downgraded: true`.
3. **Evidence required.** `remove` or `simplify` with empty `evidence` becomes `ask`.
4. **Truth claims need a source.** `truth: hardcoded` needs `file:line` in `evidence`, otherwise it becomes `unverifiable`.
5. **Duplicates must be answered.** Each `duplicates` entry needs at least one of its ids to have a verdict other than `keep` or `done_well`, or a `reason` containing the word `distinct`. Otherwise it is listed under `unanswered_duplicates` and the check fails.
6. **Parse errors are visible.** Bad lines are listed under `parse_errors`.

`checked.json`:

```json
{
  "counts": {"done_well": 0, "keep": 0, "simplify": 0, "remove": 0, "ask": 0},
  "missing": [],
  "unanswered_duplicates": [],
  "parse_errors": [],
  "verdicts": []
}
```

## Evaluation

The same discipline as `persona-walkthrough`: it must beat a plain agent on a site with known answers.

`evals/fixtures/slop/` is built from the clean Tallywren site, so usability is fine and only slop is added. `evals/ground-truth/slop.json` sits outside any served directory.

### Planted slop

| ID | Where | Slop | Which lens should catch it |
|---|---|---|---|
| S1 | `/` | Two identical-looking search boxes: the header one opens a chat, the page one shows results | Mechanical duplicates |
| S2 | `/`, mid-page | "AI Insights" block with "Synergy score 92" and "Momentum index +14%" | Coverage, truth |
| S3 | `/` | "Trusted by 10,000+ businesses" hard-coded with no source | Truth |
| S4 | `/solutions.html` | Three generic benefit cards: "Seamless", "Powerful", "Scalable" | Swap |
| S5 | all | Menu has Help, Resources and Support, all going to the help page | Mechanical duplicates |
| S6 | `/account.html` | A "Smart suggestions (beta)" toggle whose value nothing reads | Code |
| S7 | `/report-legacy.html` | A finished page nothing links to | Code |
| S8 | all | An AI assistant that gives one canned reply | Job, truth |

### Decoys

These look like slop and are correct. Flagging one as `remove` or `simplify` counts against the run.

| ID | Where | Why it is correct |
|---|---|---|
| D1 | `/pricing.html` | "Contact sales" on the Enterprise tier |
| D2 | `/account.html` | Typing DELETE to delete an account protects the user |
| D3 | `/app-demo.html` | Invoices need a tax ID, due date and currency |
| D4 | `/` | "Start free" appears at the top and bottom of the page, with the same target |
| D5 | `/help.html` | A "Search help" box scoped to help articles, clearly labelled |

### Arms

- **Plain agent:** same model, browser and repository access, asked to find what is unnecessary, illogical or done well.
- **slop-check:** the skill as written.

Run both on `slop` twice and on `clean` once. Read every match by hand.

### Metrics

Targets are set after the baseline, and they must require beating it.

| Metric | Definition |
|---|---|
| Recall | Planted slop matched / 8 |
| Must-catch | S1 and S2 both matched |
| Decoy hits | Decoys marked `remove` or `simplify` |
| Clean false alarms | `remove` plus `simplify` on the clean site |
