# Quickstart: AI Form-Filling Assistant in a Graviola App

Embed an AI assistant into any Graviola form in under 50 lines. The assistant understands your JSON Schema, fills fields via tool calls, queries linked entities from your data store, and can create new sub-entities — all with user confirmation.

## Prerequisites

- A running `graviola-ai-rest-server` (port 3002)
- A Graviola app with `useDataStore()` and `SemanticJsonForm` already working
- Redis running (for sessions)

## 1. Install

```bash
bun add @graviola/agent-form-datastore @graviola/agent-form-flow @graviola/agent-chat-components @graviola/agent-chat-markdown
```

## 2. Start the server

```bash
# from the monorepo root
bun run dev:form-server
```

Make sure `.env` has `ANTHROPIC_API_KEY` set.

## 3. Minimal integration (< 50 lines)

```tsx
import { useState } from 'react'
import { SemanticJsonForm } from '@graviola/semantic-json-form'
import { useDataStore } from '@graviola/state-hooks'
import { useFormAgentSession } from '@graviola/agent-form-flow'
import { useDatastoreFormAgent } from '@graviola/agent-form-datastore'
import { AgentFAB } from '@graviola/agent-chat-components'
import { MarkdownChatProvider } from '@graviola/agent-chat-markdown'

const SERVER_URL = 'http://localhost:3002'

export function TaskFormWithAssistant({ jsonSchema, uiSchema }) {
  const [formData, setFormData] = useState({})
  const { dataStore, ready } = useDataStore()
  const { sessionId, createSession } = useFormAgentSession({
    serverUrl: SERVER_URL,
    entityType: 'Task',
  })

  const agent = useDatastoreFormAgent({
    serverUrl: SERVER_URL,
    sessionId: sessionId ?? '',
    dataStore: dataStore!,
    jsonSchema,
    uiSchema,
    formData,
    entityType: 'Task',
    onSetFieldValue: (path, value) =>
      setFormData((prev) => ({ ...prev, [path]: value })),
    onConfirmCreate: async (type, data) =>
      window.confirm(`Create new ${type}: ${JSON.stringify(data)}?`),
  })

  if (!ready || !sessionId) return <div>Loading...</div>

  return (
    <>
      <SemanticJsonForm
        schema={jsonSchema}
        uiSchema={uiSchema}
        data={formData}
        onChange={({ data }) => setFormData(data)}
      />
      <MarkdownChatProvider>
        <AgentFAB
          messages={agent.messages}
          onSend={agent.sendMessage}
          isStreaming={agent.isStreaming}
          streamingMessageId={agent.streamingMessageId}
          pendingClarification={agent.pendingClarification}
          onAnswerClarification={agent.answerClarification}
          agentStatus={agent.agentStatus}
          title="Form Assistant"
        />
      </MarkdownChatProvider>
    </>
  )
}
```

That's it. The FAB button appears in the bottom-right corner. Users click it, type what they want, and the assistant fills the form.

## What happens under the hood

1. User types: *"Create a task for painting the school fence next Saturday, outdoor category"*
2. Assistant calls `set_multiple_fields` → fills title, description, dueDate
3. Assistant calls `search_reference_options("Category", "outdoor")` → your `dataStore.findDocumentsByLabel` is invoked automatically
4. Assistant calls `select_reference("category", "cat-42", "Outdoor")` → sets the category ID on the form
5. If a tag doesn't exist → `create_entity("Tag", { name: "Painting" })` → your `onConfirmCreate` fires → user confirms → `dataStore.upsertDocument` creates it
6. Form is filled, user reviews and submits normally

## Configuring entity types

For fine-grained control over how linked entities are resolved:

```tsx
const agent = useDatastoreFormAgent({
  // ...
  entityTypes: {
    Category: {
      display: { labelField: 'name', idField: '@id' },
      canCreate: false,  // don't allow creating new categories
    },
    Tag: {
      display: { labelField: 'label', idField: '@id' },
      canCreate: true,
      typeIRI: 'http://example.org/ontology#Tag',  // override typeNameToTypeIRI
    },
  },
})
```

## Editing sub-entities ($defs promotion)

When a user edits a sub-entity (e.g., a Tag), promote its `$defs` entry to root level:

```tsx
import { promoteDefToRoot } from '@graviola/agent-form-flow'

// Original schema has $defs.Tag = { type: "object", properties: { name, color } }
const tagSchema = promoteDefToRoot(fullSchema, 'Tag')

// Now use tagSchema as jsonSchema — the assistant understands it as a Tag form
<TaskFormWithAssistant jsonSchema={tagSchema} entityType="Tag" />
```

## Without the datastore binding (Mode A only)

If you prefer to wire callbacks manually (or don't use Graviola's data store):

```tsx
import { useFormFillingAgent, useFormAgentSession } from '@graviola/agent-form-flow'

const agent = useFormFillingAgent({
  serverUrl: SERVER_URL,
  sessionId,
  jsonSchema,
  formData,
  onSetFieldValue: (path, value) => setFormData((prev) => ({ ...prev, [path]: value })),
  onQueryOptions: async (refType, limit) => {
    // your own data fetching logic
    const items = await myApi.list(refType, { limit })
    return items.map((i) => ({ id: i.id, label: i.name }))
  },
  onSearchOptions: async (refType, query) => {
    const items = await myApi.search(refType, query)
    return items.map((i) => ({ id: i.id, label: i.name }))
  },
  onCreateEntity: async (type, data) => {
    const created = await myApi.create(type, data)
    return { id: created.id, label: created.name }
  },
})
```

## Package overview

| Package | Purpose |
|---------|---------|
| `@graviola/agent-form-datastore` | Binds agent callbacks to Graviola's `AbstractDatastore` — **start here** |
| `@graviola/agent-form-flow` | React hook (`useFormFillingAgent`) + session management |
| `@graviola/agent-form-tools` | Tool definitions + schema analyzer + system prompt (used by server) |
| `@graviola/agent-chat-components` | AgentFAB, ChatMessage, ClarificationCard (reused from forms designer) |
| `@graviola/agent-chat-markdown` | Markdown rendering in chat (reused from forms designer) |
| `graviola-ai-rest-server` | Hono server on port 3002 (streaming, Redis sessions) |
