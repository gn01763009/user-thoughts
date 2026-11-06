# Browser layer

Personas that run at the same time need separate browsers. A browser MCP gives the session one shared connection, so it can only run personas one at a time.

## Preflight (coordinator)

Pick the first that works:

1. **`agent-browser` (parallel).** Run `agent-browser --version`, or if that is missing, `npx -y agent-browser --version`. If it answers, use it. On first use run `agent-browser install` (or the `npx` form) to fetch Chrome, about 190 MB.
2. **A browser MCP (serial).** If your tool list holds a browser MCP, such as Playwright MCP, Chrome DevTools MCP or Claude in Chrome, use it one persona at a time.
3. **Neither.** Stop and show this:

```bash
npm install -g agent-browser && agent-browser install
```

## agent-browser

Verified on version 0.41.2. Each `--session` name gets its own browser with separate cookies and storage. Give every agent one session, named `ut-<run>-<persona>`, and pass it on every command.

| Task | Command |
|---|---|
| Open a page | `agent-browser --session S open <url>` |
| Set the viewport | `agent-browser --session S set viewport 390 844` |
| Screenshot | `agent-browser --session S screenshot <absolute path>` |
| Interactive elements with refs | `agent-browser --session S snapshot -i` |
| Full accessibility tree | `agent-browser --session S snapshot` |
| Click | `agent-browser --session S click @e2` |
| Fill a field | `agent-browser --session S fill @e3 "text"` |
| Press a key | `agent-browser --session S press Tab` |
| Scroll | `agent-browser --session S scroll down 600` |
| Wait | `agent-browser --session S wait 1500` |
| Page text | `agent-browser --session S get text body` |
| Current URL | `agent-browser --session S get url` |
| Go back | `agent-browser --session S back` |
| Close | `agent-browser --session S close` |

Refs change when the page changes, so take a new snapshot after any navigation. Set the viewport before your first screenshot. Use `agent-browser skills get core` for anything not listed here.

In zsh, a multi-word command stored in a variable fails. Write the full command each time, or use a shell function.

## MCP fallback (serial)

Use the same steps with the matching tools: navigate, screenshot, accessibility snapshot, click, type, resize. Between personas, clear cookies and storage for the site and close extra tabs, so the next persona arrives as a stranger. State `browser_mode: serial` in `run.json`.

Tools differ, so in the persona brief list the exact tool names available in this session.

## Closing

Each agent closes its own session when finished. The coordinator's last step is `agent-browser close --all` only if the user has no other sessions running. Otherwise close each `ut-<run>-*` session by name.
