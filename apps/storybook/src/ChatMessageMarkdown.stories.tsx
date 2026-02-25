import type { Meta, StoryObj } from '@storybook/react'
import Box from '@mui/material/Box'
import { ChatMessage, ChatMessageList } from '@graviola/agent-chat-components'
import { MarkdownChatProvider } from '@graviola/agent-chat-markdown'

// ── Sample content ─────────────────────────────────────────────────────────

const MARKDOWN_RESPONSE = `
I've updated the schema with three new fields:

### Added fields

| Field | Type | Required |
|-------|------|----------|
| \`firstName\` | string | ✅ yes |
| \`email\` | string (email) | ✅ yes |
| \`role\` | enum | no |

Here's the relevant JSON Schema snippet:

\`\`\`json
{
  "properties": {
    "firstName": { "type": "string", "title": "Vorname" },
    "email":     { "type": "string", "format": "email" },
    "role":      { "type": "string", "enum": ["admin", "user", "guest"] }
  },
  "required": ["firstName", "email"]
}
\`\`\`

> **Tip:** For the role field, use \`"ui:widget": "select"\` in the UI Schema to render it as a dropdown.
`.trim()

const MERMAID_RESPONSE = `
Here's how the form fields relate to each other:

\`\`\`mermaid
graph LR
  A[Vorname] & B[Nachname] --> C[Vollständiger Name]
  D[E-Mail] --> E[Benachrichtigungen]
  C & E --> F[Profil vollständig]
\`\`\`

The \`Vollständiger Name\` field is derived from first + last name.
`.trim()

const CODE_RESPONSE = `
Here's a TypeScript type that matches your schema:

\`\`\`typescript
interface FormData {
  firstName: string
  email: string
  role?: 'admin' | 'user' | 'guest'
}
\`\`\`

And the validation function:

\`\`\`typescript
function validate(data: FormData): boolean {
  return data.firstName.length > 0 && /^[^@]+@[^@]+$/.test(data.email)
}
\`\`\`
`.trim()

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'agent-chat-markdown/MarkdownChatProvider',
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj

// ── Stories ───────────────────────────────────────────────────────────────────

/** Full conversation with table, code block, and blockquote. */
export const WithMarkdown: Story = {
  render: () => (
    <MarkdownChatProvider>
      <Box sx={{ maxWidth: 540 }}>
        <ChatMessage
          message={{ id: '1', role: 'user', content: 'Füge Felder für Vorname, E-Mail und Rolle hinzu.' }}
        />
        <ChatMessage
          message={{ id: '2', role: 'assistant', content: MARKDOWN_RESPONSE }}
          sx={{ mt: 1 }}
        />
      </Box>
    </MarkdownChatProvider>
  ),
}

/** Syntax-highlighted code blocks in two languages. */
export const SyntaxHighlighting: Story = {
  render: () => (
    <MarkdownChatProvider>
      <Box sx={{ maxWidth: 540 }}>
        <ChatMessage
          message={{ id: '1', role: 'user', content: 'Zeig mir den passenden TypeScript-Typ.' }}
        />
        <ChatMessage
          message={{ id: '2', role: 'assistant', content: CODE_RESPONSE }}
          sx={{ mt: 1 }}
        />
      </Box>
    </MarkdownChatProvider>
  ),
}

/** Mermaid diagram rendered inside an assistant bubble. */
export const MermaidDiagram: Story = {
  render: () => (
    <MarkdownChatProvider enableMermaid>
      <Box sx={{ maxWidth: 540 }}>
        <ChatMessage
          message={{ id: '1', role: 'user', content: 'Zeig mir die Abhängigkeiten der Felder.' }}
        />
        <ChatMessage
          message={{ id: '2', role: 'assistant', content: MERMAID_RESPONSE }}
          sx={{ mt: 1 }}
        />
      </Box>
    </MarkdownChatProvider>
  ),
}

/** User bubbles are always plain text — markdown syntax is NOT rendered. */
export const UserBubblePlainText: Story = {
  render: () => (
    <MarkdownChatProvider>
      <Box sx={{ maxWidth: 540 }}>
        <ChatMessage
          message={{
            id: '1',
            role: 'user',
            content: '**This** should _not_ be rendered as markdown — user bubbles stay plain.',
          }}
        />
      </Box>
    </MarkdownChatProvider>
  ),
}

/** Without a provider — falls back to plain text rendering (context default). */
export const FallbackNoProvider: Story = {
  render: () => (
    <Box sx={{ maxWidth: 540 }}>
      <ChatMessage
        message={{ id: '1', role: 'assistant', content: MARKDOWN_RESPONSE }}
      />
    </Box>
  ),
}

/** Full message list with mixed messages. */
export const MessageList: Story = {
  render: () => (
    <MarkdownChatProvider>
      <Box sx={{ maxWidth: 540, height: 500 }}>
        <ChatMessageList
          messages={[
            { id: '1', role: 'user', content: 'Füge Felder hinzu.' },
            { id: '2', role: 'assistant', content: MARKDOWN_RESPONSE },
            { id: '3', role: 'user', content: 'Zeig mir die Abhängigkeiten.' },
            { id: '4', role: 'assistant', content: MERMAID_RESPONSE },
          ]}
        />
      </Box>
    </MarkdownChatProvider>
  ),
}
