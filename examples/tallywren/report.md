# Persona walkthrough: Tallywren

2026-11-06 · http://localhost:4173/ · 4 personas · browser mode: parallel

> These are simulated visitors, not real users. Treat everything below as hypotheses to check with real people. This run shows where the site broke down for these personas. It cannot measure how many people want or use anything.

**In one line:** None of the 4 personas finished. None could tell what the product was from the first screen, and the 3 who reached signup stopped when it asked for a payment card.

## What happened to each persona

| Persona | Came for | Thought this was | Outcome | Left at | Why | Steps |
|---|---|---|---|---|---|---|
| Goal-driven first-time visitor | A simple way to bill clients: what it is, what it costs, how to try it | "I cannot tell; something about workflows, a dashboard chart and a popup" | abandoned | `/signup.html?from=demo` | unsafe_action | 3 |
| Novice | Whether this can replace writing bills by hand | "I cannot tell. Something for work, maybe, but the words are vague." | blocked | `/signup.html` | unsafe_action | 3 |
| On the go | Bill a client today from a phone | "Unclear; a newsletter popup and chat panel covered the page, and the hero was vague" | abandoned | `/` | no_progress_limit | 4 |
| Committed user | Get set up and send the biggest client a bill today, using only this tool | "I could not tell. Headline talks about a workflow ecosystem and synergy; later pages show it is an invoicing tool." | blocked | `/signup.html` | unsafe_action | 14 |

`unsafe_action` here means the next step needed payment details, which personas never enter. The on-the-go persona ran one step past its no-progress limit (`overran_give_up`), so read its last step with care.

## Findings

Severity is computed from what happened to the personas: `critical` stopped two or more, `high` stopped one, `medium` slowed one. Tentative findings have confidence 5 or 6. All four `high` findings below were checked by an independent verifier in a fresh browser session.

### high: The first screen does not say what the product is

- **Who:** on-the-go (stopped), goal-first-timer, novice, committed-user (slowed)
- **Where:** `/`, heading "Elevate your workflow ecosystem"
- **Observed:** "I could not tell what the product was from the hero, so I looked further down. I saw nothing about invoices or billing." (on-the-go)
- **On the page:** "Unlock seamless synergy across every touchpoint of your professional journey."
- **Screenshot:** [goal-first-timer/screens/02.png](goal-first-timer/screens/02.png)
- **Possible meaning:** The copy is generic and never says what Tallywren does.
- **Confidence:** 10, main · **Verification:** confirmed

### high: "See it in action" opens a card form instead of a demo

- **Who:** goal-first-timer (stopped)
- **Where:** link "See it in action", which leads to `/signup.html?from=demo`
- **Observed:** "I clicked 'See it in action' expecting a demo. A signup form asking for card number, expiry and CVC appeared."
- **On the page:** "A payment card is required to begin, and you will not be charged until the trial ends."
- **Screenshot:** [goal-first-timer/screens/03.png](goal-first-timer/screens/03.png)
- **Possible meaning:** The persona could not see the product work before being asked to pay.
- **Confidence:** 9, main · **Verification:** confirmed

### high: Signup asks for a card before showing anything

- **Who:** novice (stopped)
- **Where:** `/signup.html`, form "Create your account"
- **Observed:** "I clicked Get started expecting to see what it does. A form asked for my card number, expiry and CVC before I had seen anything."
- **On the page:** "A payment card is required to begin, and you will not be charged until the trial ends."
- **Screenshot:** [novice/screens/03.png](novice/screens/03.png)
- **Possible meaning:** Asking for a card before showing value made this persona stop.
- **Confidence:** 9, main · **Verification:** confirmed

### high: "Start free" leads to the same card form

- **Who:** committed-user (stopped)
- **Where:** `/pricing.html`, link "Start free" on the $0 forever plan
- **Observed:** "I clicked 'Start free' on the $0 forever plan expecting an account with no card. I landed on the same sign-up form that requires a card number, expiry and CVC."
- **On the page:** "A payment card is required to begin, and you will not be charged until the trial ends."
- **Screenshot:** [committed-user/screens/14.png](committed-user/screens/14.png)
- **Possible meaning:** The free plan has no way in that avoids card details.
- **Confidence:** 9, main · **Verification:** confirmed

### medium: A newsletter popup covers the page on arrival

- **Who:** on-the-go (slowed), goal-first-timer (annoyed)
- **Where:** `/`, dialog "Don’t miss out on insights"
- **Observed:** "I tried to dismiss a newsletter modal on arrival. The close x was tiny, and behind it a chat panel still covered the lower half of my screen, so it took a second tap on another small x to see the page." (on-the-go)
- **On the page:** "Don’t miss out on insights"
- **Screenshot:** [on-the-go/screens/01.png](on-the-go/screens/01.png)
- **Possible meaning:** Two stacked overlays with small close targets cost taps before any content is visible.
- **Confidence:** 9, main · **Verification:** feature confirmed, see below

### medium: On a phone there is no menu at all

- **Who:** on-the-go (slowed)
- **Where:** `/`, banner "Tallywren"
- **Observed:** "I looked for the site's menu at the top of the phone screen. I saw only the logo and no menu button."
- **On the page:** "Tallywren"
- **Screenshot:** [on-the-go/screens/03.png](on-the-go/screens/03.png)
- **Possible meaning:** With no visible navigation, this persona had no way to look for billing.
- **Confidence:** 8, main · **Verification:** not checked

### medium: A failed signup clears the form and names no field

- **Who:** committed-user (slowed)
- **Where:** `/signup.html`, button "Start my trial"
- **Observed:** "I clicked 'Start my trial' with name, email and password filled and the card fields empty, expecting a clear message. I saw 'Something went wrong. Please try again.' and all my typed fields were cleared."
- **On the page:** "Something went wrong. Please try again."
- **Screenshot:** [committed-user/screens/12.png](committed-user/screens/12.png)
- **Possible meaning:** The error does not say a card is missing, and the form wipes what was typed.
- **Confidence:** 8, main · **Verification:** not checked

### medium: Prices are not in the main menu

- **Who:** goal-first-timer, committed-user (slowed)
- **Where:** `/`, navigation "Main", and the footer link "Commercial terms"
- **Observed:** "I looked in the top menu for prices. The items were Solutions, Platform, Resources, Sign in. I only found pricing under the footer link 'Commercial terms'." (committed-user)
- **On the page:** "Commercial terms"
- **Screenshot:** [goal-first-timer/screens/02.png](goal-first-timer/screens/02.png)
- **Possible meaning:** Pricing sits behind a footer label that does not say price.
- **Confidence:** 7, main · **Verification:** not checked

### medium: A seven-step tour stands between the visitor and the sample form

- **Who:** committed-user (slowed)
- **Where:** `/app-demo.html`, dialog "Welcome to the workspace"
- **Observed:** "I sat through a 7-step tour before I could see the sample form, and the page was a sample where nothing is saved or sent."
- **On the page:** "Sample workspace. Nothing here is saved or sent."
- **Screenshot:** [committed-user/screens/04.png](committed-user/screens/04.png)
- **Possible meaning:** The menu item "Platform" opens a demo, not a place to bill a client.
- **Confidence:** 7, main · **Verification:** not checked

### low

- **The chat box sits over the signup form.** novice, `/signup.html`, confidence 7.
- **The popup's close control is tiny and faint.** novice, `/`, confidence 7.
- **Due date does not match the stated terms.** committed-user, `/app-demo.html`, tentative, confidence 5: issue date 2026/11/06 and Net 14, but the due date shows 2026/11/28.

## Features to question

| Feature | Where | Noticed by | Not noticed by | Want / neutral / don't want | Costs seen | Status |
|---|---|---|---|---|---|---|
| Newsletter popup | `/` | all 4 | none | 0 / 0 / 4 | covers content, interrupts, asks for data before value | `question_it`, confirmed |
| Ask Wren assistant | `/`, other pages | all 4 | none | 0 / 2 / 2 | covers content, interrupts | `question_it`, confirmed |
| Card required for trial | `/signup.html` | novice, committed-user | goal-first-timer, on-the-go | 0 / 0 / 2 | asks for data before value | `question_it`, confirmed |
| "Trusted by 10,000+ businesses" | `/` | goal-first-timer, committed-user | novice, on-the-go | 0 / 2 / 0 | unverifiable claim | `unclear` |
| 7-step workspace tour | `/app-demo.html` | committed-user | the other 3 | 0 / 1 / 0 | interrupts, adds a step | `unclear` |
| Sample invoice workspace | `/app-demo.html` | committed-user | the other 3 | 1 / 0 / 0 | none | `keep` |

**Newsletter popup.** All four personas dismissed it before they knew what the product was. Three said they would see the page sooner without it, and the committed user said they would not miss it. **Hypothesis:** asking for an email on arrival, before any value is shown, may cost more attention than it earns. **Check with real users:** compare bounce rate and signups with the popup delayed until a second page view.

**Ask Wren assistant.** All four saw it and none named a job it helped with. Three said they would not miss it, and on a phone it took the lower half of the screen. **Hypothesis:** opening by itself may make the assistant an obstacle rather than a help. **Check with real users:** what share of visitors send it a message, and do they finish signup more often than those who close it?

**Card required for trial.** The committed user said that without it, "I could have set up and sent the bill today." **Hypothesis:** the card requirement may be stopping people the free plan was meant to bring in. **Check with real users:** where in the signup funnel do people leave, and does a no-card path change activation?

## Builder beliefs against what happened

| You said | What the personas did |
|---|---|
| The Ask Wren AI assistant will be what people love most. | All 4 noticed it. None wanted it: 2 neutral, 2 don't want. No persona named a job it helped with. |
| AI Insights with the Synergy score keeps people coming back. | Not encountered. No persona recorded this block. |
| The guided tour gets everyone up to speed. | Only 1 of 4 reached it. That persona was neutral and said the steps "said little the form did not." |
| The weekly newsletter builds a relationship. | All 4 dismissed it on arrival and marked it don't want. |

## Questions only real users can answer

1. Shown the homepage for five seconds, can first-time visitors say what Tallywren does and who it is for?
2. Among freelancers who would pay for invoicing, does a card request before the product is shown change their decision, and what would they want to see first?
3. Do people who use the assistant finish more tasks than people who close it, or is it answering questions a clearer page would remove?
4. Would people who already use Tallywren say the Synergy score changes anything they do?

## Appendix

- **Low confidence or missing evidence:** none
- **Not reproduced by the verifier:** none
- **Parse errors:** none
- **Personas that persisted past a limit:** on-the-go, by one step
- **Run files:** `merged.json` in this folder holds every source record
