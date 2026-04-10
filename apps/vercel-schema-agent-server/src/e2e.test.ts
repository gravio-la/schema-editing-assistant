/**
 * E2E tests for the FormsWizard Agent Server.
 * Requires the server to be running: bun run dev:server
 * Run with: bun test --timeout 40000
 *
 * Schema-editing tools have no server-side execute handler — tool calls are streamed
 * to the client only. Redis `schemaState` is not updated by `/api/chat` alone; the
 * consumer applies patches locally and may PUT `/api/schema` or send `schema` on the
 * next chat request. Agent tests therefore assert on the UI message stream (tool
 * calls + text), not on GET `/api/schema` after chat.
 */
import { describe, test, expect, beforeAll } from 'bun:test'
import {
  parseJsonEventStream,
  readUIMessageStream,
  uiMessageChunkSchema,
  type UIMessage,
} from 'ai'

const BASE = process.env['SERVER_URL'] ?? 'http://localhost:3001'

interface ParsedAgentStream {
  text: string
  toolCalls: Array<{ toolCallId: string; toolName: string; args: Record<string, unknown> }>
  toolResults: Array<{ toolCallId: string; result: unknown }>
  error: string | null
  finishReason: string | null
}

/** Parse streamed response — UI message wire format (AI SDK 6). */
async function parseStream(res: Response): Promise<ParsedAgentStream> {
  if (!res.body) {
    const text = await res.text()
    return { text, toolCalls: [], toolResults: [], error: null, finishReason: null }
  }
  const chunkStream = parseJsonEventStream({
    stream: res.body,
    schema: uiMessageChunkSchema,
  }).pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        if (!chunk.success) throw chunk.error
        controller.enqueue(chunk.value)
      },
    }),
  )

  let last: UIMessage | undefined
  for await (const msg of readUIMessageStream({ stream: chunkStream })) {
    last = msg
  }

  const text =
    last?.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('') ?? ''

  const toolCalls: ParsedAgentStream['toolCalls'] = []
  const toolResults: ParsedAgentStream['toolResults'] = []

  for (const p of last?.parts ?? []) {
    if (typeof p.type !== 'string' || !p.type.startsWith('tool-')) continue
    const toolName = p.type.slice('tool-'.length)
    if (!('toolCallId' in p)) continue
    const toolCallId = (p as { toolCallId: string }).toolCallId
    const state = 'state' in p ? (p as { state: string }).state : undefined
    if (
      (state === 'input-available' || state === 'output-available') &&
      'input' in p &&
      (p as { input?: unknown }).input !== undefined
    ) {
      toolCalls.push({
        toolCallId,
        toolName,
        args: ((p as { input: unknown }).input ?? {}) as Record<string, unknown>,
      })
    }
    if (state === 'output-available' && 'output' in p) {
      toolResults.push({ toolCallId, result: (p as { output: unknown }).output })
    }
  }

  return { text, toolCalls, toolResults, error: null, finishReason: 'stop' }
}

interface CustomRendererPayload {
  name: string
  description: string
  jsonSchema: Record<string, unknown>
  uiOptions?: Record<string, unknown>
  /** JSON Schema describing all allowed `uiOptions` keys and value shapes. */
  uiOptionsSchema?: Record<string, unknown>
}

async function createSession(language: 'de' | 'en' = 'en') {
  const res = await fetch(`${BASE}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
  })
  const body = (await res.json()) as {
    sessionId: string
    session: { schemaState: { jsonSchema: unknown; uiSchema: unknown; version: number } }
  }
  return body
}

async function createSessionWithCustomRenderers(
  customRenderers: CustomRendererPayload[],
  language: 'de' | 'en' = 'en',
) {
  const res = await fetch(`${BASE}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, customRenderers }),
  })
  expect(res.status).toBe(200)
  const body = (await res.json()) as {
    sessionId: string
    session: {
      schemaState: { jsonSchema: unknown; uiSchema: unknown; version: number }
      customRenderers?: CustomRendererPayload[]
    }
  }
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

beforeAll(async () => {
  const res = await fetch(`${BASE}/health`).catch(() => null)
  if (!res?.ok) throw new Error(`Server not reachable at ${BASE} — run bun run dev:server first`)
})

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
    const s = (await res.json()) as { id: string }
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

  test('POST /api/session stores customRenderers on the session', async () => {
    const customRenderers: CustomRendererPayload[] = [
      {
        name: 'Location Picker',
        description: 'Map / geo input.',
        jsonSchema: { type: 'string', format: 'geo-point' },
        uiOptionsSchema: {
          type: 'object',
          properties: {
            widget: { const: 'location-picker' },
            maxZoom: { type: 'number', minimum: 1, maximum: 20 },
          },
          required: ['widget'],
          additionalProperties: false,
        },
        uiOptions: { widget: 'location-picker' },
      },
    ]
    const { sessionId, session } = await createSessionWithCustomRenderers(customRenderers, 'en')
    expect(session.customRenderers).toEqual(customRenderers)

    const res = await fetch(`${BASE}/api/session/${sessionId}`)
    expect(res.status).toBe(200)
    const loaded = (await res.json()) as { customRenderers?: CustomRendererPayload[] }
    expect(loaded.customRenderers).toEqual(customRenderers)
  })
})

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
    const result = (await res.json()) as { version: number; jsonSchema: unknown }
    expect(result.version).toBe(1)
    expect(result.jsonSchema).toEqual(newSchema)
  })

  test('GET /api/schema/:id returns 404 for unknown session', async () => {
    const res = await fetch(`${BASE}/api/schema/00000000-0000-0000-0000-000000000000`)
    expect(res.status).toBe(404)
  })
})

describe('Agent chat (live LLM)', () => {
  let sessionId: string

  beforeAll(async () => {
    const { sessionId: id } = await createSession('de')
    sessionId = id
  })

  test(
    'turn 1 — stream shows add_field for required name (stored schema unchanged without client)',
    async () => {
      const stream = await chat(sessionId, 'Füge ein Pflichtfeld für den Namen hinzu')

      expect(stream.error).toBeNull()

      const call = stream.toolCalls.find((t) => t.toolName === 'add_field')
      expect(call).toBeDefined()
      expect(call!.args['name']).toBe('name')
      expect(call!.args['required']).toBe(true)

      const schema = await getSchema(sessionId)
      expect(schema.version).toBe(0)
      expect(Object.keys(schema.jsonSchema.properties ?? {})).toHaveLength(0)

      expect(stream.text.length > 0 || stream.toolCalls.length > 0).toBe(true)
    },
    40000,
  )

  test(
    'turn 2 — stream shows add_field for email with format email',
    async () => {
      const stream = await chat(sessionId, 'Füge jetzt noch eine E-Mail-Adresse hinzu')

      expect(stream.error).toBeNull()

      const call = stream.toolCalls.find((t) => t.toolName === 'add_field')
      expect(call).toBeDefined()
      const schemaArg = call!.args['schema'] as Record<string, unknown>
      expect(schemaArg['format']).toBe('email')

      const finalSchema = await getSchema(sessionId)
      expect(finalSchema.version).toBe(0)
    },
    40000,
  )

  test('turn 3 — session persists messages; Redis schema still empty (client-only tools)', async () => {
    const res = await fetch(`${BASE}/api/session/${sessionId}`)
    expect(res.status).toBe(200)

    const session = (await res.json()) as {
      id: string
      schemaState: { version: number; jsonSchema: { properties: unknown } }
      messages: unknown[]
      language: string
    }

    expect(session.id).toBe(sessionId)
    expect(session.language).toBe('de')
    expect(session.schemaState.version).toBe(0)
    expect(Object.keys((session.schemaState.jsonSchema.properties ?? {}) as object)).toHaveLength(0)

    expect(session.messages.length).toBeGreaterThanOrEqual(4)
  })
})

const LOCATION_PICKER_RENDERER: CustomRendererPayload[] = [
  {
    name: 'Location Picker',
    description: 'Use for coordinates, geo-point, or map pin input.',
    jsonSchema: { type: 'string', format: 'geo-point' },
    uiOptionsSchema: {
      type: 'object',
      properties: {
        widget: { const: 'location-picker' },
        maxZoom: { type: 'number', minimum: 1, maximum: 20 },
      },
      required: ['widget'],
      additionalProperties: false,
    },
    uiOptions: { widget: 'location-picker' },
  },
]

describe('Custom renderers (live LLM)', () => {
  let sessionId: string

  beforeAll(async () => {
    const { sessionId: id } = await createSessionWithCustomRenderers(LOCATION_PICKER_RENDERER, 'en')
    sessionId = id
  })

  test(
    'add_field picks up session custom renderer (location picker)',
    async () => {
      const stream = await chat(sessionId, 'Add a location picker field')

      expect(stream.error).toBeNull()

      const call = stream.toolCalls.find((t) => t.toolName === 'add_field')
      expect(call).toBeDefined()

      const schemaArg = call!.args['schema'] as Record<string, unknown>
      const uiOpt = call!.args['uiOptions'] as Record<string, unknown> | undefined

      const hasGeoFormat = schemaArg['format'] === 'geo-point'
      const hasWidget = uiOpt?.['widget'] === 'location-picker'
      expect(hasGeoFormat || hasWidget).toBe(true)
    },
    40000,
  )
})
