# Rerun one person

`--rerun <person-id>` walks one person again after the builder has changed the product.

1. Do Step 1 of `SKILL.md`. Read `.user-thoughts/last-setup.json`. If it is missing or has no card with that id, stop and list the
   ids it has. If its `url` is not this URL, stop and say which URL it was saved for.
2. Start a new run folder, named as Step 1 of `SKILL.md` says. Write `run.json` with the saved `url`, `depth`, `language`, `vision` and `understanding`,
   only this person in `personas` and `people` (the card as saved, with any `overlay`; an older card gets a `voice`, as briefs.md says), `rerun_of` set to `runs[<id>]` from
   `last-setup.json`, and the other fields as in Step 7 of `SKILL.md`. Copy `builder-claims.md` from that earlier run if it exists.
3. Write the exit interview with the same pitch, then do Steps 8, 9, 11 and 12 of `SKILL.md` for this person in a new session.
4. The person starts from the beginning with no memory. Never pass the earlier trace, outcome or findings into the
   brief, so a change made before the point where they gave up is still walked through.
5. Skip word of mouth. Afterwards set `runs[<id>]` in `last-setup.json` to the new folder. The report shows both
   timelines side by side.
