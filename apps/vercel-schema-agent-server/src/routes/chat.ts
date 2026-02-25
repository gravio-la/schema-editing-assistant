import { Hono } from 'hono'
import { getSession } from '../session/store'
import { runAgentStream } from '../agent/stream'
import logger from '../logger'

const chat = new Hono()

chat.post('/', async (c) => {
  // Support both the raw API format { sessionId, message } used by e2e tests
  // and the Vercel AI SDK useChat format { sessionId, messages: [...] }.
  const body = await c.req.json<{
    sessionId: string
    message?: string
    messages?: Array<{ role: string; content: string }>
  }>()

  // Extract the latest user message — prefer explicit `message` field, fall back
  // to the last user entry from the `messages` array sent by useChat.
  const userMessage =
    body.message ??
    body.messages?.filter((m) => m.role === 'user').pop()?.content ??
    ''

  if (!userMessage) return c.json({ error: 'No message provided' }, 400)

  const session = await getSession(body.sessionId)
  if (!session) return c.json({ error: 'Session not found' }, 404)

  logger.info('chat request', { sessionId: body.sessionId, messageLength: userMessage.length })
  try {
    return await runAgentStream(session, userMessage)
  } catch (err) {
    logger.error('runAgentStream threw', { err: String(err), stack: err instanceof Error ? err.stack : undefined })
    return c.json({ error: String(err) }, 500)
  }
})

export default chat
