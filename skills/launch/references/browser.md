# Browser layer

Personas that run at the same time need separate browsers. A browser MCP gives the session one shared connection, so it can only run personas one at a time.

Every agent reaches `agent-browser` through `${CLAUDE_SKILL_DIR}/scripts/browser.mjs`. The allow rule names that script and not the browser tool, because the tool's own options can run a program, load code or attach to a real browser. The script allows the commands below and refuses everything else with exit code 2.

## Preflight (coordinator)

Pick the first that works:

1. **`agent-browser` (parallel).** Run `node ${CLAUDE_SKILL_DIR}/scripts/browser.mjs --version`. If it answers, use `node ${CLAUDE_SKILL_DIR}/scripts/browser.mjs` as the prefix. If a browser command then reports that Chrome is missing, treat it as point 3: installing is the builder's step, and the script refuses it.
2. **A browser MCP with its own profile (serial).** Use a browser MCP only if it starts its own browser with an isolated profile, such as Playwright MCP in isolated mode or Chrome DevTools MCP launching its own Chrome, one persona at a time. A browser attached to the user's real profile is never an option, whichever tool drives it. That rules out Claude in Chrome and any MCP connected to a Chrome the user already has open: it would walk the site signed in as them, and clearing cookies and closing tabs would log them out and close their work. If you cannot tell which kind you have, treat it as attached.
3. **Neither.** Stop and show this:

```bash
npm install -g agent-browser && agent-browser install
```

## agent-browser

Verified on version 0.41.2. Each `--session` name gets its own browser with separate cookies and storage. Give every agent one session and pass it first on every command: `ut-<YYYYMMDD-HHMM>[-<suffix>]-p<n>` for a person, where `<n>` is their number in the list, and the same with `-verify` or `-coordinator` for those two. `<suffix>` is the run folder's collision suffix, if it got one. Names carry no host, because the browser's socket path has a length limit. Below, `<prefix>` stands for `node ${CLAUDE_SKILL_DIR}/scripts/browser.mjs --session S`. If `agent-browser` is missing the script exits with code 3 and prints the install command; show that and stop.

| Task | Command |
|---|---|
| Open a page (http, https or `about:blank` only) | `<prefix> open <url>` |
| Set the viewport | `<prefix> set viewport 390 844` |
| Screenshot (absolute path ending in `.png`, inside `.user-thoughts/runs/` of this project) | `<prefix> screenshot <path>` |
| Interactive elements with refs | `<prefix> snapshot -i` |
| Full accessibility tree | `<prefix> snapshot` |
| Click | `<prefix> click @e2` |
| Fill a field | `<prefix> fill @e3 "text"` |
| Press a key | `<prefix> press Tab` |
| Scroll | `<prefix> scroll down 600` |
| Wait | `<prefix> wait 1500` |
| Page text | `<prefix> get text body` |
| Current URL | `<prefix> get url` |
| Go back | `<prefix> back` |
| Close | `<prefix> close` |

The script also allows `type`, `select`, `check`, `uncheck`, `hover`, `scrollintoview`, `find`, `get title`, `eval`, `set device`, `tab`, `forward` and `reload`. The only options are `-i` and `-c` on `snapshot`, `--full` on `screenshot`, and `--name` and `--exact` on `find`. Anything else is refused, by name: file upload and download, plugins, saved logins, and options that change which browser runs or attach it to a real one. A refused command is not worth retrying in another form. A value shaped exactly like an option, such as `--help`, cannot be typed, because the browser tool would read it as one.

Refs change when the page changes, so take a new snapshot after any navigation. Set the viewport before your first screenshot.

Write the full command each time: a multi-word command stored in a variable fails in zsh, and shell variables do not carry between commands.

## MCP fallback (serial)

Use the same steps with the matching tools: navigate, screenshot, accessibility snapshot, click, type, resize. Before the first persona (after the coordinator's own visit) and between personas, clear cookies and storage for the site and close extra tabs, so each persona arrives as a stranger. State `browser_mode: serial` in `run.json`.

Tools differ, so in the persona brief list the exact tool names available in this session.

## Closing

Each agent closes its own session when finished. The coordinator's last step is to close each `ut-<YYYYMMDD-HHMM>[-<suffix>]-*` session by name. Never use `close --all`: it would close the user's other sessions too, and the script refuses it.
