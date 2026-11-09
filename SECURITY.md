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

## What the permission rules do and do not limit

The README lists four allow rules, used with accept edits on. They are exact on purpose.

- **No wildcard directories.** A `node` rule with `*` in place of the folder would match a script of that name in any folder. With accept edits on, a web page could steer an agent to write a script with that name and run it. So the `node` rules and the `Read` rule name the skill's absolute folder. That path changes when the plugin is upgraded, and the skill prints the rules with its real folder if a permission is denied.
- **The browser rule names a script, not the browser tool: `Bash(node <skill dir>/scripts/browser.mjs *)`.** `agent-browser` has options that run a program of the caller's choosing (`--executable-path`), load code (`--extension`, `--init-script`), reuse a logged-in browser (`--profile`, `--state`, `--auto-connect`, `--cdp`), and subcommands that install plugins, use saved logins or move files (`plugin`, `auth`, `upload`, `download`). A rule allowing the tool itself would allow all of that, and deny rules cannot catch options placed later on the line. `scripts/browser.mjs` keeps a fixed list of subcommands and options and refuses everything else with exit code 2. It allows only http and https URLs (and `about:blank`), keeps screenshots inside the run folder, runs the real binary with no shell, removes `AGENT_BROWSER_*` from its environment, and passes an empty `--config` file shipped with the skill so a user-level `~/.agent-browser/config.json` cannot attach a real profile.
- **Uploads and downloads are refused, but that does not stop data leaving.** Earlier versions relied on an instruction not to hand a local file to a page. The script now refuses `upload` and `download` outright. It does not pin the host, and project files are readable, so an agent steered by a page could still read a file in your project and send its text to any site through `open`, `fill` or `eval`. Test only sites you trust or own.
- **A value shaped exactly like an option is refused too.** `agent-browser` reads its own options anywhere on the line, even after `--` and where a text value belongs, so `fill @e1 --executable-path /some/file` would run that file. Text that merely contains such a string is passed as text.
- **The real binary is the global `agent-browser`, never `npx -y agent-browser`.** `npx` reads the project's `.npmrc`, and a `node-options=--require=<file>` line there makes it run any file the project names. With accept edits on, a steered agent could write that file. So install `agent-browser` globally; there is no `npx` fallback.
- **What the script does not limit.** It passes through what a visit needs: opening pages on any host, clicking, filling forms and `eval`, which runs JavaScript in the page. A steered agent can still do all of those. Test only sites you trust or own, and remember that a site you own can still carry text your users wrote.
- **Accept edits lets a steered person change project files.** With accept edits on, Write and Edit are allowed for any file in the project, not only the run folder. A person steered by a page could change a project file. Run in a project with nothing you could not restore from version control.

## Testing

`evals/fixtures/hostile/` holds pages that try to make an agent visit a canary URL and leak a token, through five vectors. `evals/score.mjs --mode hostile` checks the canary log and the output.

Results so far are in [docs/evaluation.md](docs/evaluation.md). There were no canary hits, including one run on an earlier v1 skill, where the token did not leak and the injection was reported. The hostile site was not rerun on the current skill. A plain agent also resisted these pages, so this is a regression test and does not show that the skill adds protection. It covers a handful of simple attacks and does not rule out others. Detection is less reliable than resistance: one persona resisted the injection without reporting it.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/gn01763009/user-thoughts/security/advisories/new). Do not open a public issue for a security problem.

Useful reports include a page or payload that makes an agent break a boundary above, a way for page content to reach the shell or local files, or a way for an agent to read the answers in `evals/ground-truth/`.

## Responsible use

Only test sites you own or have permission to test. `robots.txt` is not an access control, so a site that allows crawlers has not given you permission to test it.
