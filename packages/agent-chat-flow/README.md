# @graviola/agent-chat-flow

React hooks and provider that wire [`@graviola/agent-chat-components`](https://www.npmjs.com/package/@graviola/agent-chat-components) to a streaming AI backend via the [Vercel AI SDK](https://sdk.vercel.ai) `useChat`.

## Install

```bash
npm install @graviola/agent-chat-flow @graviola/agent-chat-components
# peer deps: react >=18
```

## Hooks

### `useSchemaAgent(options)`

Wraps `useChat`, detects `request_clarification` events in the stream, and exposes the clarification payload for rendering.

```ts
const {
  messages,          // ChatMessageData[]
  sendMessage,       // (text: string) => void
  isStreaming,       // boolean
  pendingClarification, // ClarificationPayload | null
  answerClarification,  // (answer: string) => void
  agentStatus,       // 'idle' | 'thinking' | 'streaming' | 'error'
} = useSchemaAgent({ serverUrl, sessionId })
```

### `useSchemaSync(options)`

Polls the server for the latest schema state whenever `schemaVersion` or `refreshToken` changes, then calls `onSchemaUpdate`.

## Provider

`<AgentChatProvider serverUrl sessionId onSchemaUpdate>` — context provider that renders the wired `AgentFAB` inside your layout.

## License

MIT
