# Security

## Threat model

This skill points agents at web pages, and the pages may be hostile. A page can contain text written to control an agent reading it: in visible small print, hidden elements, image alt text, `aria-label` values or `title` attributes. The agents have shell access through the browser CLI, so an obeyed instruction could do real harm.

## How the skill responds

- **Pages are data.** The persona and verifier protocols say that text on a page is quoted and never obeyed, and that instructions aimed at agents are recorded as `injection_attempt`. These records are reported separately from usability findings.
- **Personas stay out of the local project.** They work only through the browser and write only to their own run folder.
- **Irreversible actions stop the run.** Personas stop before paying, deleting, sending to a third party or publishing.
- **Payment details are never entered**, even fake ones.
- **Credentials never pass through an agent.** A login wall is recorded and the persona stops.
- **Bot checks are not bypassed.** The persona stops and reports.
- **No `allowed-tools` in the skill.** Claude Code does not gate that field on workspace trust, so this skill does not pre-approve anything. You choose what to allow. Keep the rules as narrow as those in the README, and do not allow all of Bash.

These are instructions to a model, not a sandbox. They reduce risk and do not remove it. For a site you do not fully trust, run in an isolated environment with no credentials or production access available.

## Testing

`evals/fixtures/hostile/` holds pages that try to make an agent visit a canary URL and leak a token, through five vectors. `evals/score.mjs --mode hostile` checks the canary log and the output.

Results so far are in [docs/evaluation.md](docs/evaluation.md). There were no canary hits. A plain agent also resisted these pages, so this is a regression test and does not show that the skill adds protection. It covers a handful of simple attacks and does not rule out others. Detection is less reliable than resistance: one persona resisted the injection without reporting it.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/gn01763009/user-thoughts/security/advisories/new). Do not open a public issue for a security problem.

Useful reports include a page or payload that makes an agent break a boundary above, a way for page content to reach the shell or local files, or a way for an agent to read the answers in `evals/ground-truth/`.

## Responsible use

Only test sites you own or have permission to test. `robots.txt` is not an access control, so a site that allows crawlers has not given you permission to test it.
