import { Hono } from 'hono'
import { getSession } from '../session/store'
import { runFormFillingStream } from '../agent/stream'
import { extractLastUserTextFromChatBody } from '../agent/last-user-text'
import logger from '../logger'

const chat = new Hono()

chat.get('/', (c) =>
  c.json({
    ok: true,
    method: 'POST',
    body: 'useChat JSON with sessionId + messages (and schema/formData as used by form agent)',
  }),
)

chat.post('/', async (c) => {
  const body = await c.req.json<{
    sessionId: string
    message?: string
    messages?: Array<{ role: string; content?: unknown; parts?: unknown }>
    schema?: {
      jsonSchema: Record<string, unknown>
      uiSchema?: Record<string, unknown>
    }
    formData?: Record<string, unknown>
    entityType?: string
    metadata?: Record<string, unknown>
  }>()

  const lastUserMessage = extractLastUserTextFromChatBody(body)

  if (!lastUserMessage) return c.json({ error: 'No message provided' }, 400)

  const session = await getSession(body.sessionId)
  if (!session) return c.json({ error: 'Session not found' }, 404)

  logger.info('chat request', {
    sessionId: body.sessionId,
    messageCount: body.messages?.length ?? 1,
    hasSchema: body.schema !== undefined,
    hasFormData: body.formData !== undefined,
    entityType: body.entityType,
  })

  try {
    return await runFormFillingStream(
      session,
      body.messages ?? [{ role: 'user', content: lastUserMessage }],
      body.schema,
      body.formData,
      body.entityType,
      body.metadata,
    )
  } catch (err) {
    logger.error('runFormFillingStream threw', {
      err: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    return c.json({ error: String(err) }, 500)
  }
})

export default chat
