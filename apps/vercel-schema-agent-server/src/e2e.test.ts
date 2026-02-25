/**
 * E2E tests for the FormsWizard Agent Server.
 * Requires the server to be running: bun run dev:server
 * Run with: bun test --timeout 40000
 */
import { describe, test, expect, beforeAll } from 'bun:test'

const BASE = process.env['SERVER_URL'] ?? 'http://localhost:3001'

// ---------------------------------------------------------------------------
// Vercel AI SDK data stream parser
// Format: "<type>:<json-payload>\n"
//   0 = text chunk   9 = tool call   a = tool result   3 = error   d = finish
// ---------------------------------------------------------------------------
interface StreamEvent {
  text: string
  toolCalls: Array<{ toolCallId: string; toolName: string; args: Record<string, unknown> }>
  toolResults: Array<{ toolCallId: string; result: unknown }>
  error: string | null
  finishReason: string | null
}

async function parseStream(res: Response): Promise<StreamEvent> {
  const raw = await res.text()
  const toolCalls: StreamEvent['toolCalls'] = []
  const toolResults: StreamEvent['toolResults'] = []
  const chunks: string[] = []
  let error: string | null = null
  let finishReason: string | null = null

  for (const line of raw.split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const type = line.slice(0, colon)
    const payload = line.slice(colon + 1)
    try {
      switch (type) {
        case '0': chunks.push(JSON.parse(payload) as string); break
        case '9': toolCalls.push(JSON.parse(payload)); break
        case 'a': toolResults.push(JSON.parse(payload)); break
        case '3': error = JSON.parse(payload) as string; break
        case 'd': finishReason = (JSON.parse(payload) as { finishReason: string }).finishReason; break
      }
    } catch { /* skip malformed lines */ }
  }

  return { text: chunks.join(''), toolCalls, toolResults, error, finishReason }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function createSession(language: 'de' | 'en' = 'en') {
  const res = await fetch(`${BASE}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
  })
  const body = await res.json() as { sessionId: string; session: { schemaState: { jsonSchema: unknown; uiSchema: unknown; version: number } } }
  return body
}

async function getSchema(sessionId: string) {
  const res = await fetch(`${BASE}/api/schema/${sessionId}`)
  return res.json() as Promise<{ jsonSchema: Record<string, unknown>; uiSchema: Record<string, unknown>; version: number }>
}

async function chat(sessionId: string, message: string) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  })
  expect(res.status).toBe(200)
  return parseStream(res)
}

// ---------------------------------------------------------------------------
// Verify server is up before any test runs
// ---------------------------------------------------------------------------
beforeAll(async () => {
  const res = await fetch(`${BASE}/health`).catch(() => null)
  if (!res?.ok) throw new Error(`Server not reachable at ${BASE} — run bun run dev:server first`)
})

// ---------------------------------------------------------------------------
// Suite 1: Session management
// ---------------------------------------------------------------------------
describe('Session management', () => {
  test('POST /api/session creates a new session with empty schema', async () => {
    const { sessionId, session } = await createSession('en')
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(session.schemaState.jsonSchema).toEqual({ type: 'object', properties: {}, required: [] })
    expect(session.schemaState.uiSchema).toEqual({})
    expect(session.schemaState.version).toBe(0)
  })

  test('GET /api/session/:id re-attaches to existing session', async () => {
    const { sessionId } = await createSession()
    const res = await fetch(`${BASE}/api/session/${sessionId}`)
    expect(res.status).toBe(200)
    const s = await res.json() as { id: string }
    expect(s.id).toBe(sessionId)
  })

  test('GET /api/session/:id returns 404 for unknown session', async () => {
    const res = await fetch(`${BASE}/api/session/00000000-0000-0000-0000-000000000000`)
    expect(res.status).toBe(404)
  })

  test('DELETE /api/session/:id removes session', async () => {
    const { sessionId } = await createSession()
    await fetch(`${BASE}/api/session/${sessionId}`, { method: 'DELETE' })
    const res = await fetch(`${BASE}/api/session/${sessionId}`)
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Suite 2: Schema API
// ---------------------------------------------------------------------------
describe('Schema API', () => {
  test('GET /api/schema/:id returns empty schema for new session', async () => {
    const { sessionId } = await createSession()
    const schema = await getSchema(sessionId)
    expect(schema.jsonSchema).toEqual({ type: 'object', properties: {}, required: [] })
    expect(schema.uiSchema).toEqual({})
    expect(schema.version).toBe(0)
  })

  test('PUT /api/schema/:id replaces schema and bumps version', async () => {
    const { sessionId } = await createSession()
    const newSchema = { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] }
    const res = await fetch(`${BASE}/api/schema/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonSchema: newSchema }),
    })
    expect(res.status).toBe(200)
    const result = await res.json() as { version: number; jsonSchema: unknown }
    expect(result.version).toBe(1)
    expect(result.jsonSchema).toEqual(newSchema)
  })

  test('GET /api/schema/:id returns 404 for unknown session', async () => {
    const res = await fetch(`${BASE}/api/schema/00000000-0000-0000-0000-000000000000`)
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Suite 3: Agent chat — replicates the manual curl flow end-to-end
// ---------------------------------------------------------------------------
describe('Agent chat (live Anthropic API)', () => {
  // One session shared across the three turns so we test session continuity
  let sessionId: string

  beforeAll(async () => {
    const { sessionId: id } = await createSession('de')
    sessionId = id
  })

  test('turn 1 — adds required name field, schema version becomes 1', async () => {
    const stream = await chat(sessionId, 'Füge ein Pflichtfeld für den Namen hinzu')

    expect(stream.error).toBeNull()

    // Agent must have called add_property
    const call = stream.toolCalls.find(t => t.toolName === 'add_property')
    expect(call).toBeDefined()
    expect(call!.args['name']).toBe('name')
    expect(call!.args['required']).toBe(true)

    // Tool executor must have succeeded
    const result = stream.toolResults.find(r => r.toolCallId === call!.toolCallId)
    expect((result!.result as { message: string }).message).toContain('Applied add_property')

    // Schema persisted to Redis and version bumped
    const schema = await getSchema(sessionId)
    expect(schema.version).toBe(1)
    expect(schema.jsonSchema.properties).toHaveProperty('name')
    const properties = schema.jsonSchema.properties as Record<string, unknown>
    expect((properties['name'] as Record<string, unknown>)['type']).toBe('string')
    expect(schema.jsonSchema.required).toContain('name')

    // Agent replied in German
    expect(stream.text.length).toBeGreaterThan(0)
  }, 40000)

  test('turn 2 — adds email field with format:email and uiSchema widget, version becomes 2', async () => {
    const stream = await chat(sessionId, 'Füge jetzt noch eine E-Mail-Adresse hinzu')

    expect(stream.error).toBeNull()

    const call = stream.toolCalls.find(t => t.toolName === 'add_property')
    expect(call).toBeDefined()
    const schema = (call!.args['schema'] as Record<string, unknown>)
    expect(schema['format']).toBe('email')

    const finalSchema = await getSchema(sessionId)
    expect(finalSchema.version).toBe(2)
    const props = finalSchema.jsonSchema.properties as Record<string, Record<string, unknown>>
    expect(props).toHaveProperty('email')
    expect(props['email']!['format']).toBe('email')

    // Agent should have auto-applied the email uiSchema widget
    const ui = finalSchema.uiSchema as Record<string, Record<string, unknown>>
    expect(ui['email']?.['ui:widget']).toBe('email')
  }, 40000)

  test('turn 3 — session persists: re-attach shows both fields and full message history', async () => {
    const res = await fetch(`${BASE}/api/session/${sessionId}`)
    expect(res.status).toBe(200)

    const session = await res.json() as {
      id: string
      schemaState: { version: number; jsonSchema: { properties: unknown } }
      messages: unknown[]
      language: string
    }

    expect(session.id).toBe(sessionId)
    expect(session.language).toBe('de')
    expect(session.schemaState.version).toBe(2)

    const props = session.schemaState.jsonSchema.properties as Record<string, unknown>
    expect(props).toHaveProperty('name')
    expect(props).toHaveProperty('email')

    // History should contain the two user messages plus assistant replies
    expect(session.messages.length).toBeGreaterThanOrEqual(4)
  })
})
