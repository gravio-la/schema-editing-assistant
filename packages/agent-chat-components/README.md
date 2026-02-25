# @graviola/agent-chat-components

Headless-friendly MUI v7 chat UI primitives for AI agent interfaces. Framework-agnostic — all data via props, no backend wiring.

## Install

```bash
npm install @graviola/agent-chat-components
# peer deps: react >=18, @mui/material >=7, @emotion/react, @emotion/styled
```

## Components

| Component | Description |
|---|---|
| `<ChatMessage>` | User / assistant bubble with optional streaming animation |
| `<ChatMessageList>` | Scrollable message list, auto-scrolls to the latest message |
| `<ClarificationCard>` | Renders a clarification question with optional answer chips and a free-text fallback |
| `<ChatInput>` | Textarea + send button, disables itself while streaming |
| `<AgentFAB>` | Expandable floating action button with drag-to-reposition and viewport clamping |
| `<AgentStatusIndicator>` | Pulsing status dot for idle / thinking / streaming states |

## Markdown support

Wrap your tree with `<MarkdownChatProvider>` from [`@graviola/agent-chat-markdown`](https://www.npmjs.com/package/@graviola/agent-chat-markdown) to enable rich markdown rendering (syntax highlighting, Mermaid diagrams) inside assistant bubbles.

## License

MIT
