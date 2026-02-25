# @graviola/agent-chat-markdown

Optional markdown rendering provider for [`@graviola/agent-chat-components`](https://www.npmjs.com/package/@graviola/agent-chat-components). Adds syntax-highlighted code blocks (via [prism-react-renderer](https://github.com/FormidableLabs/prism-react-renderer)) and Mermaid diagram rendering to assistant chat bubbles.

## Install

```bash
npm install @graviola/agent-chat-markdown
# peer deps: react >=18, @mui/material >=6
```

## Usage

Wrap your app (or just the chat area) with `<MarkdownChatProvider>`. All `<ChatMessage>` assistant bubbles inside the tree will automatically render markdown.

```tsx
import { MarkdownChatProvider } from '@graviola/agent-chat-markdown'
import { themes } from 'prism-react-renderer'

<MarkdownChatProvider prismTheme={themes.oneDark} enableMermaid>
  {/* your chat UI */}
</MarkdownChatProvider>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `prismTheme` | `PrismTheme` | `themes.oneDark` | Syntax highlighting colour theme |
| `enableMermaid` | `boolean` | `true` | Render `mermaid` fenced code blocks as diagrams |

Without this provider, `<ChatMessage>` falls back to plain-text rendering — no breaking change.

## License

MIT
