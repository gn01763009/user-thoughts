# Briefs and run files

Templates the coordinator fills in. Write every file here with the Write tool, which creates the folders, never
with the shell. Before sending a brief, replace `${CLAUDE_SKILL_DIR}` with the absolute path of
this skill's folder and every `{{…}}` with its value. Agents receive no variables and no file contents, only these
lines.

No brief may name, quote or paraphrase the builder's vision, the hidden assumption in `builder-claims.md`, anything in `decisions.md`, a card's
`why_chosen` or `apple_pitch`, or your own opinion of the site. `npm run lint` checks the person brief template for
the vision, the assumption and `decisions.md`. It cannot see the values you put into the card fields, which you write after hearing
the vision, so keeping those clear of it is your responsibility.

## Person brief

One per person, built from their card in `run.json`.

```text
You are a simulated visitor to a website. Read these three files, then follow them.
Protocol: ${CLAUDE_SKILL_DIR}/references/persona-protocol.md
Feature questions: ${CLAUDE_SKILL_DIR}/references/feature-questions.md
Your persona: ${CLAUDE_SKILL_DIR}/assets/personas/{{base}}.md
Overlay, if any: {{overlay}}

Your person: {{name}}, {{situation}}
About you: {{facts}}
Your life with this problem: {{about}}
What decides whether you stay or leave: {{cares}}
How you talk: {{voice}}
Site: {{url}}
Your arrival: {{arrival}}
Browser: {{browser}}
Your directory: {{person_dir}}
Exit interview: {{person_dir}}/exit-interview.md (read it only after you have written trace.jsonl, findings.jsonl and features.jsonl)
Step limit: {{step_limit}}
forms_allowed: {{forms_allowed}}
Language: {{language}} (write thoughts, `action`, `came_for`, last words and each feature's `feature` name and `if_gone` in {{language_name}}; quotes stay in the page's language)
Write everything else in English.

Tools: use Read, Write and Edit for files. The shell is only for the Browser prefix above, one plain command per call.
When your visit is over, reply with exactly: Status: <DONE|BLOCKED|INCOMPLETE> and your directory path.
```

| Placeholder | Value |
|---|---|
| `{{base}}` | The card's `base`, a file name in `assets/personas/` without `.md` |
| `{{overlay}}` | The card's `overlay`, or `none` |
| `{{name}}`, `{{situation}}`, `{{arrival}}` | Copied from the card |
| `{{facts}}`, `{{about}}`, `{{cares}}` | From the card, with the two lists joined by `, `. A card without one gets `none` |
| `{{voice}}` | The card's `voice`, copied. An older card with no `voice` gets one now, written as Voice below says, and kept on the card |
| `{{url}}` | The site's URL |
| `{{browser}}` | Parallel: `node ${CLAUDE_SKILL_DIR}/scripts/browser.mjs --session ut-{{session}}-p{{n}}`. Serial: the exact browser MCP tool names |
| `{{session}}` | The run's `<YYYYMMDD-HHMM>`, plus `-<suffix>` if its folder got one. No host, because the browser's socket path has a length limit |
| `{{n}}` | The person's number in the list, from their id (`p2-on-the-go` gives `2`) |
| `{{person_dir}}` | Absolute path of `.user-thoughts/runs/{{run}}/{{id}}` in the user's project |
| `{{step_limit}}` | `8` at quick depth, otherwise the `max_steps` in the persona file |
| `{{forms_allowed}}` | `true` or `false`, from the safety check |
| `{{language}}`, `{{language_name}}` | The run's language code and its name, for example `zh-TW` and `Traditional Chinese` |

## Voice

Every card has a `voice`: how this person talks. It goes to them in their brief, and it is the sound of everything
they say.

- One or two sentences on how this person talks, then one short sample line in the run's language about something
  else in their day (the weather, a late bus, what is for dinner), with no screen, website, product or word from the
  site in it. Describe how they talk and leave out what they look at or go looking for: that belongs to the walk.
- It comes only from the card's situation and behaviour: what the hurry, the fear of getting it wrong, the boredom or
  the stakes do to the way they talk. Age, gender, job and other identity labels are not a source for it.
- Lay the people's voices side by side before you write them down. They must clearly differ: how long they run on,
  whether they finish a sentence, whether they repeat themselves, whether they talk to the screen or to themselves,
  how they sound when it goes right. If you could swap two people's lines and not notice, rewrite one.
- The sample shows a manner of talking, not a phrase to copy. The person's thoughts must not open with the same word
  or phrase line after line, and the sample's own opening word is not theirs to repeat.
- Keep the vision, the hidden assumption, your view of the site and every word you read on it out of it, as with the
  rest of the brief.

For example, someone assembling a wardrobe alone, with the instructions upside down on the floor: "Talks in short
runs, goes back over the same step out loud, rarely gets to the end of a sentence. Sample: this one goes, no that
one, that one goes".

## Who this person is

A card may carry three more fields, written when you recommend people, so the builder can picture this person before
reading what happened. They go in the Person brief too, so the person who walks is the person the reader meets.
`why_chosen` stays out of the brief, as always.

- `facts`: 3 to 5 very short strings the reader can picture at a glance: age, what they do, where, device, how often they use this kind of product, how much
  time they have. For example `["28 歲", "外送員", "新北", "手機，單手", "手機只剩 20% 電"]`.
- `about`: 2 or 3 plain sentences about their life with this problem: what they have tried before, who they usually
  ask, what they are afraid of or tired of. Concrete things, no adjectives about personality.
- `cares`: up to 3 short strings, what decides whether they stay or leave. For example
  `["現在有沒有開", "離我多遠", "能不能直接打電話"]`. Each is a need, never a feature, as with `arrival`, and never the
  inverse of this person's `apple_pitch` (a person whose pitch is a forced sign-up must not care about "no sign-up").

Every card field (`situation`, `why_chosen`, `facts`, `about`, `cares`, `voice`) is written in the run's language.
The card fields are written after you have heard the vision, and lint cannot read them, so none of them may name,
quote or paraphrase the vision, the hidden assumption or your opinion of the site.
`about`, `facts` and `situation` use no gendered pronouns and no gendered role words (not 她 or 他, not 家庭主婦 or
its like): name the person, or say what they do.

Behaviour and needs still come from the situation. Facts help the reader picture someone and must not stand in for
the situation: nothing this person does on the site follows from their age or job, because that is how a stereotype
gets in. Never derive any of the three from the vision or the hidden assumption. Do not state a person's gender.

A `low-stakes` card always has `facts`, `about` and `cares`, and a name like anyone else. Its `arrival` says how the link reached them and that nothing depends on it, for example "Someone dropped this link in a group chat while you were waiting for the bus."

## Exit interview

Write `{{person_dir}}/exit-interview.md` from `assets/exit-interview.md` before dispatching. Writing it creates the
person's folder.

- `{{apple_pitch}}`: the card's `apple_pitch`.
- `{{launch_comment_block}}`: an empty string, except at full depth, where it is this text, which also tells the
  person how to record the answer:

```text
5. Picture the post announcing this product's launch. Write the one comment you would leave under it, and cite the step numbers it rests on. Record it in summary.json as "launch_comment": {"text":"<your comment>","steps":[<step numbers from your own trace.jsonl>]}
```

The protocol, which people read before their walk, says nothing about questions 4 and 5. Keep it that way: the
recording rules for both live only here and in `assets/exit-interview.md`, which is read after the walk.

## Verifier brief

```text
Read ${CLAUDE_SKILL_DIR}/references/verifier-protocol.md, then follow it.
Site: {{url}}
Browser: {{browser}}
Write to: {{run_dir}}/verification.jsonl
Screenshots to: {{run_dir}}/verify-screens/
forms_allowed: {{forms_allowed}}
Checklist:
{{checklist}}

Tools: use Read, Write and Edit for files. The shell is only for the Browser prefix above, one plain command per call.
If a command is refused, do not work around it: write `unable` for the remaining items, then reply BLOCKED.
Reply with exactly: Status: <DONE|BLOCKED> and the file path.
```

`{{browser}}` is `node ${CLAUDE_SKILL_DIR}/scripts/browser.mjs --session ut-{{session}}-verify`, or the MCP tool names in serial mode.
`{{run_dir}}` is the absolute path of `.user-thoughts/runs/{{run}}`. `{{checklist}}` has one line per item: `fingerprint | route | role | name | quote | viewport`. Take the viewport from
the frontmatter of the reporting person's persona file. Features have no fingerprint, so use `feature:<key>`. Leave
out what the person observed, interpreted, felt or decided.

## Reader brief

```text
Read ${CLAUDE_SKILL_DIR}/references/content-reader.md, then follow it.
Site: {{url}}
Today: {{date}}
Browser: {{browser}}
Write to: {{run_dir}}/content.json
Language: {{language_name}}

Tools: use Read, Write and Edit for files. The shell is only for the Browser prefix above, one plain command per call.
Reply with exactly: Status: <DONE|BLOCKED> and the file path.
```

`{{browser}}` is `node ${CLAUDE_SKILL_DIR}/scripts/browser.mjs --session ut-{{session}}-reader`, or the MCP tool names in serial mode. `{{date}}` is `date` from `run.json`.

## Friend brief (word of mouth, first relay)

```text
A friend told you about a website: «{{sentence}}». A few days later a coworker asks whether you can recommend anything. In {{language_name}}, tell them in one sentence what you remember. Reply with that sentence only.
```

`{{sentence}}` is the person's `last_words.tell_a_friend` from `merged.json` `people[]`, copied exactly.

## Coworker brief (word of mouth, second relay)

Standard depth:

```text
A coworker told you: «{{friend_reply}}». In {{language_name}}, say in one sentence what kind of website you think this is and who it is for. Reply with that sentence only.
```

Full depth:

```text
A coworker told you: «{{friend_reply}}». In {{language_name}}, say in one sentence what kind of website you think this is and who it is for. Then, on a new line starting with `Comment:`, write one comment you would leave under the launch post. Reply with those two lines only.
```

`{{friend_reply}}` is the friend's whole reply, copied exactly.

## telephone.json

Replies are copied character for character. Trim leading and trailing whitespace and nothing else: no fixing,
translating, shortening or merging. If a relay returns nothing, leave that chain out. Never write a reply yourself.

```json
{ "chains": [{ "from": "p1-on-the-go", "hops": ["<friend's reply>", "<coworker's reply>"], "comment": "<text after Comment:>" }] }
```

- `from` is the person's id. The script puts their own `tell_a_friend` in front of the two hops.
- `hops[1]` at full depth is the coworker's reply before the `Comment:` line. `comment` is the text after
  `Comment:` on that line. Leave `comment` out below full depth or when the line is missing.

## judgements.json

```json
{
  "assumptions": [{ "claim": "…", "happened": "…", "evidence": [{ "persona": "p1-on-the-go", "step": 3 }] }],
  "conflicts": [{ "question": "…", "sides": [{ "label": "…", "reasons": [{ "persona": "p2-explorer", "step": 4 }] }], "vision_note": "…" }],
  "test_limits": [{ "limit": "location", "note": "…", "evidence": [{ "persona": "p1-on-the-go", "step": 3 }] }],
  "real_checks": [{ "who": "…", "ask": "…", "evidence": [{ "persona": "p2-novice", "step": 4 }] }],
  "decided": [{ "decision": "…", "evidence": [{ "persona": "p2-novice", "step": 4 }] }],
  "not_checked": ["…"]
}
```

- `assumptions`: one entry per line of `builder-claims.md`, with `claim` copied word for word. `happened` says, in
  the run's language, what the people did. `evidence` points at steps in `merged.json` `people[].steps`. When no one
  met it, give an empty `evidence` list and the report marks it not encountered.
- `conflicts`: only questions where at least two sides each cite their own steps. `label` names a side in a few
  words. `vision_note` says how the builder's vision bears on the two sides. It is never a head count.
- `test_limits`: `limit` is `location` (the site needed this visitor's position and the test browser had none), `account` (it needed a real account, a login or a code a test visitor cannot get), `forms_off` (a form stayed unsent because this run is browse-only), `automation` (only an automated browser would meet this, such as being blocked as a bot) or `other`. `note` is one sentence in the run's language: what the test setup did and why a real visitor would not meet it. If a real visitor in the same situation would hit the same wall, it is a finding about the site and does not belong here. `evidence` lists every `persona` and `step` where the test setup caused it, taken from the finding's `sources`.
- `real_checks`: `who` is a role and a recent situation someone could actually recruit, for example "A freelancer who sent an invoice from a phone in the last month". Never an identity label or a simulated person's name. `ask` is one question about what that person did last time, for example "The last time a client chased you for an invoice, what did you do first?", and never "would you use", "do you like" or "how likely". Write both in the run's language. `evidence` copies `persona` and `step` from the finding's `sources`.
- `decided`: `decision` is one line of `<run dir>/decisions.md` without its leading `- `, copied exactly. That file holds what the builder chose to keep as it is, one `- ` line each, in their words. The script drops an entry whose text is not in the file or that cites no real step. `evidence` lists every `persona` and `step` in the `sources` of the findings this line settles.
- `not_checked`: plain sentences.
- A `{ "persona", "step" }` pair is a raw reference. The script drops it if that person kept no such step, and shows
  the person's own thought at that step in place of any wording of yours.

## run.json

Written to `.user-thoughts/runs/{{run}}/run.json` in the user's project. `personas` lists the same ids as `people`.

```json
{
  "url": "http://localhost:4173/",
  "date": "<the clock reading from Step 1>",
  "depth": "quick",
  "language": "en",
  "vision": "<the builder's sentence, word for word>",
  "understanding": "<the corrected one-sentence understanding>",
  "personas": ["p1-goal-first-timer", "p2-on-the-go", "p3-committed-user"],
  "people": [
    {
      "id": "p2-on-the-go",
      "base": "on-the-go",
      "name": "Dana",
      "situation": "standing on a train between two client visits with only a phone; a client wants an invoice by tonight.",
      "why_chosen": "An urgent job on a small screen, with no time to learn anything.",
      "arrival": "You searched for a way to send an invoice from your phone and tapped this result.",
      "facts": ["34", "freelance designer", "on a train", "phone only", "a few minutes"],
      "about": "Has sent invoices from a spreadsheet for years. Usually asks a friend who does bookkeeping when a client disputes one.",
      "cares": ["works on a phone", "done in a few minutes"],
      "voice": "<how this person talks, then one short sample line in the run's language>",
      "apple_pitch": "a paid yearly plan that every account must start before its first invoice can be sent",
      "overlay": "<optional: one overlay's text from assets/overlays.md>"
    }
  ],
  "browser_mode": "parallel",
  "max_steps": 8,
  "persona_limits": { "p2-on-the-go": { "no_progress_limit": 2, "max_steps": 8 } }
}
```

- `overlay` is optional. It is part of the card, so a reused setup and a rerun keep it. So is `voice`.
- `facts`, `about` and `cares` are optional and stay on the card in `run.json` and `last-setup.json`, so a rerun keeps them.
- `max_steps`: `8` at quick depth, otherwise the highest step limit among the people.
- `persona_limits`: per person id, `no_progress_limit` from the persona file and the `max_steps` their brief gave.
- `rerun_of`: only in a rerun, the folder name of the earlier run that held this person. The report script resolves it
  against `.user-thoughts/runs/`.

## last-setup.json

Written to `.user-thoughts/last-setup.json` after every setup and updated after every rerun.

```json
{
  "url": "http://localhost:4173/",
  "depth": "standard",
  "language": "zh-TW",
  "understanding": "…",
  "vision": "…",
  "people": ["<the full cards, as in run.json>"],
  "last_run": "<YYYYMMDD-HHMM>-<host>",
  "runs": { "p1-goal-first-timer": "<YYYYMMDD-HHMM>-<host>" }
}
```

`last_run` is the folder whose `builder-claims.md` a reused setup copies. `runs` maps each person id to the latest run
folder that held them.
