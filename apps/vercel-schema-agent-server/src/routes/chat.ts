import { Hono } from 'hono'
import { getSession } from '../session/store'
import { runAgentStream } from '../agent/stream'
import { extractLastUserTextFromChatBody } from '../agent/last-user-text'
import logger from '../logger'

const chat = new Hono()

/** So opening /api/chat in a browser shows the route exists (POST carries the stream). */
chat.get('/', (c) =>
  c.json({
    ok: true,
    method: 'POST',
    body:
      'useChat JSON with sessionId + messages, or legacy { sessionId, message } — see README',
  }),
)

chat.post('/', async (c) => {
  // Support both the raw API format { sessionId, message } used by e2e tests
  // and the Vercel AI SDK useChat format { sessionId, messages: [...] }.
  const body = await c.req.json<{
    sessionId: string
    message?: string
    /** Full message history sent by useChat on every request (includes tool call/result history). */
    messages?: Array<{ role: string; content: unknown }>
    /** Current schema snapshot from the client's Redux store.
     *  Sent on every request (incl. auto tool-result continuations) so the
     *  system prompt always reflects the live Redux state, not stale Redis data. */
    schema?: {
      jsonSchema: Record<string, unknown>
      uiSchema: Record<string, unknown>
    }
    selectedElement?: { type: string; scope?: string; label?: string }
  }>()

  const lastUserMessage = extractLastUserTextFromChatBody(body)

  if (!lastUserMessage) return c.json({ error: 'No message provided' }, 400)

  const session = await getSession(body.sessionId)
  if (!session) return c.json({ error: 'Session not found' }, 404)

  logger.info('chat request', {
    sessionId: body.sessionId,
    messageCount: body.messages?.length ?? 1,
    lastMessageRole: body.messages?.[body.messages.length - 1]?.role ?? 'user',
    hasSelection: body.selectedElement !== undefined,
    hasSchema: body.schema !== undefined,
    schemaFieldCount: body.schema
      ? Object.keys((body.schema.jsonSchema as any)?.properties ?? {}).length
      : null,
  })

  try {
    return await runAgentStream(
      session,
      body.messages ?? [{ role: 'user', content: lastUserMessage }],
      body.schema,
      body.selectedElement,
    )
  } catch (err) {
    logger.error('runAgentStream threw', { err: String(err), stack: err instanceof Error ? err.stack : undefined })
    return c.json({ error: String(err) }, 500)
  }
})

export default chat
