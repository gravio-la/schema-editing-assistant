# debug-app

Minimal Vite + React harness for the schema agent chat (`AiAssistantProvider` + client tool executor), with a **debug panel** (session id, tool log, live `jsonSchema` / `uiSchema`) and **Cypress E2E** tests.

## Prerequisites

- **Agent server** (Redis + API keys as in `apps/vercel-schema-agent-server`):  
  `bun run dev:server` from the monorepo root.
- **This app** on port **5174**:  
  `bun run dev:debug` from the monorepo root (or `bun run dev` in this package).

Optional: `VITE_AGENT_SERVER_URL` (default `http://localhost:3001`).

**Browser logs in the terminal:** this app uses **Vite**, not `Bun.serve()`, so Bun’s `development: { console: true }` does not apply. In dev, [`vite-plugin-client-console.ts`](vite-plugin-client-console.ts) forwards `console.*`, `window.onerror`, and unhandled rejections to the process running `vite` (lines prefixed with `[browser]`).

**Cypress cannot load the app:** the dev server must be running (`bun run dev:debug`). Cypress is configured with `baseUrl: http://127.0.0.1:5174` (not `localhost`) to avoid IPv4/IPv6 mismatches with Electron. Open **http://127.0.0.1:5174/** in a normal browser if you want the same origin as Cypress.

## Cypress

**Nix dev shell:** `flake.nix` sets `CYPRESS_RUN_BINARY` to `pkgs.cypress` from `nixos-unstable`. The npm package `cypress` in this app’s `package.json` is pinned to the **same major.minor.patch** as that derivation (currently `14.5.4`) so the CLI and binary versions match. After changing either, run `bun install` and re-enter `nix develop`.

```bash
# Terminal 1
bun run dev:server

# Terminal 2
bun run dev:debug

# Terminal 3 (this package)
bun run cypress:open
# or headless
bun run cypress:run
```

Tests assume the agent `/health` endpoint is up. Live-LLM specs (`03-tool-calls`, `04-clarification`) need a working model and may be flaky; the root `cypress.config.ts` enables one retry in run mode.
