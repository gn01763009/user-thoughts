---
name: slop-check
description: >-
  Use when someone is building or has built a website or web app and wants to know what should not exist:
  what is excessive, illogical or overbuilt, what can be cut, or whether a page is AI slop. Typical requests:
  "what can we cut", "is this overbuilt", "does this make sense", "review this from first principles",
  "check for AI slop", 哪裡多餘, 沒邏輯, 做太多, 砍掉什麼, 第一性原則看一下. Not for finding where users get
  stuck, code review, or visual polish.
argument-hint: "<url> [path to repo]"
---

# Slop Check

Asks of everything in a product: why is this here? The burden of proof is on the element. The output is a short
list of what to cut, what to fix, what to protect, and what only the builder can answer.

Anyone can list what looks excessive. What goes wrong in practice is more specific: reviewers praise controls they
never used, notice duplicates without comparing them, and delete things that exist for reasons they cannot see.
This skill is built to prevent those three.

## Step 1: Get the purpose

Nothing can be judged until the purpose is stated. Ask for what you do not already have, in one message:

- **Who** it is for
- **Main job** they come to do, and its steps
- **What the business needs** from it, such as sign-ups, search traffic or a paid plan. "Not sure" is allowed, but
  the review will then cut less, because anything might be serving the business.

If the builder cannot say what the main job is, stop and report that as the finding. Everything else depends on it.

If the host is not `localhost` or `127.0.0.1`, also ask whether they own the site or may test it, and whether it is
production. Set `forms_allowed` to `true` only for localhost or a staging site they own.

## Step 2: Hand it to a fresh reviewer

Spawn one agent to do the review, because an agent that built the site will defend it. Give it paths and values
only, and no opinion about the site.

```text
Read <skill dir>/references/reviewer-protocol.md, then follow it.
Who: <who>
Main job and steps: <job>
Business needs: <needs, or "unknown">
Site: <url>
Source: <repo path, or "none">
Browser: <agent-browser command prefix with --session slop-<host>>
Write to: <absolute path of .user-thoughts/slop/<YYYYMMDD-HHMM>-<host>>
forms_allowed: <true or false>

Reply with exactly: Status: <DONE|BLOCKED> and the folder path.
```

For the browser, use `agent-browser` if it is on the path, otherwise `npx -y agent-browser`. With neither, use any
browser tool in this session. With no browser at all, stop and say so, because the review depends on using the site.

If there is no agent tool, do the review yourself and say in the result that it was not independent.

## Step 3: Report back

Read `review.md` from the run folder and pass it on, in the user's language, shortest list first:

1. **Rebuild:** what this would look like built from the purpose alone, and what is missing
2. **Cut:** what to remove, with the evidence
3. **Fix:** things that do not do what they promise
4. **Ask:** the questions only the builder can answer
5. **Protect:** what is done well

Keep the reviewer's labels. Do not turn an `ask` into a recommendation to delete.

If the user wants the changes made, apply the Fix and Cut items that have a page or code fact, one commit per item
so each can be undone, and leave every `ask` alone.
