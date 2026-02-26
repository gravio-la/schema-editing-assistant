# JSON-Schema and Form UI Schema AI Agent

> **Experimental** — This project is under active development and not yet production-ready. APIs, data formats, and architecture may change without notice.

An AI-powered assistant for building and editing JSON Schema + UI Schema form definitions through natural conversation. Describe what you want your form to look like — in German or English — and the agent issues precise, structured edits to the live schema document pair.

## Goals

- **Conversational form authoring** — users describe fields, validation rules, and layout in plain language; the agent translates intent into exact schema mutations
- **Human-in-the-loop clarification** — when intent is ambiguous (e.g. "Dropdown" could mean `oneOf`, autocomplete, or an API-backed lookup), the agent pauses and asks rather than guessing
- **Minimal, auditable edits** — every change is a targeted patch against the current schema version; inverse patches are stored so undo is always possible
- **Multilingual** — responds in the user's language (German or English), including domain-specific vocabulary like *Pflichtfeld* (required field) and *Adresseingabe* (address sub-schema)
- **Embeddable UI** — a draggable floating chat component (`AgentFAB`) that can be dropped into any React app alongside an existing form renderer

## Architecture

```
apps/
  vercel-schema-agent-server/   # Hono API — streaming AI agent, Redis session store
  storybook/                    # Component development and integration demos

packages/
  agent-chat-components/        # Headless-ish MUI v7 chat UI (no backend dependency)
  agent-chat-flow/              # useChat wiring, schema sync, clarification handling
```

The server exposes three HTTP endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/session` | Create a new session, returns `{ sessionId }` |
| `POST /api/chat` | Streaming chat — sends tool-call events and text deltas |
| `GET /PUT /api/schema/:sessionId` | Read or overwrite the current schema state |

The agent runs on Anthropic Claude (default) or a local Ollama model, configured via environment variables.

## Prerequisites

- [Nix](https://nixos.org/) with flakes enabled, **or** Bun ≥ 1.1 and Redis installed manually
- An Anthropic API key (or a running Ollama instance)

## Setup

### 1. Enter the dev shell (Nix)

```sh
nix develop
```

This provides `bun` and `redis`, and registers the `run-dev-redis` helper command.

### 2. Install dependencies

```sh
bun install
```

### 3. Configure environment

```sh
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY (or set PROVIDER=ollama and OLLAMA_BASE_URL)
```

### 4. Start Redis

```sh
run-dev-redis   # Nix dev shell
# or
redis-server    # if installed manually
```

### 5. Start the API server

```sh
bun run dev:server
# Server listens on http://localhost:3001
```

### 6. Start Storybook (component dev)

```sh
bun run dev:storybook
# Opens on http://localhost:6006
```

## Smoke test

```sh
# Create a session
SESSION=$(curl -s -X POST http://localhost:3001/api/session | jq -r '.sessionId')

# Send a message (streams tool-call events + text)
curl -N -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION\",\"message\":\"Füge ein Pflichtfeld für den Vornamen hinzu\"}"

# Inspect the schema after the edit
curl http://localhost:3001/api/schema/$SESSION
```

## Workspace scripts

| Script | What it does |
|---|---|
| `bun run dev:server` | Start API server with hot reload |
| `bun run dev:storybook` | Start Storybook on port 6006 |
| `bun run build` | Build all packages and apps |
| `bun run typecheck` | Run `tsc --noEmit` across the whole monorepo |


## License

MIT
