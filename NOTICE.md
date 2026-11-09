# Notice

No text or code was copied from the projects below. This project's wording and scripts are original. It does draw on their ideas, credited here.

If you copy text or code from any of those projects, follow its licence. For the MIT projects, keep the copyright notice and licence text. Check each skill's own licence file in `anthropics/skills`, since that repository has no licence at its root.

## Agent skills

- **[obra/superpowers](https://github.com/obra/superpowers)** (MIT): writing a skill test-first and watching an agent fail without it; matching the form of guidance to the kind of failure; evidence before claims; treating a subagent's report as unverified.
- **[garrytan/gstack](https://github.com/garrytan/gstack)** (MIT): requiring a quote before a finding keeps high confidence; treating no findings as a valid result; fingerprint dedupe where only distinct sources raise confidence; confidence bands; doing severity arithmetic outside the model; keeping credentials out of agents; not reading source code during a browser test.
- **[mattpocock/skills](https://github.com/mattpocock/skills)** (MIT): the advice to use one install method per agent; answering what the data can answer and keeping only what a person must decide.
- **[anthropics/skills](https://github.com/anthropics/skills)**: comparing runs with and without a skill.
- **[Anthropic, "How we built our multi-agent research system"](https://www.anthropic.com/engineering/multi-agent-research-system)** and the deep-research skill: a coordinator that delegates and does not do the work, starting agents together, handing off through files.
- **[savkevip/ghostuser](https://github.com/savkevip/ghostuser)** and **[berober2003/synthetic-user-harness](https://github.com/berober2003/synthetic-user-harness)**: persona patience fields, abandonment as an outcome, and a per-feature judgement.

## UX sources

Personas and methods draw on work by Alan Cooper, Steve Krug, Pirolli and Card, Andrei Broder, Nielsen Norman Group, Microsoft Inclusive Design, W3C WAI, the GenderMag project, Wharton and colleagues (cognitive walkthrough), and Harry Brignull (deceptive.design). Sources with links are in [docs/research.md](docs/research.md).

## Tools

The test sites and persona runs use [agent-browser](https://github.com/vercel-labs/agent-browser). It is not bundled.

Tallywren, used in the test sites and examples, is a fictional product.
