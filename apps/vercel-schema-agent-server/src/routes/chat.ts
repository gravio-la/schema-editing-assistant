import { Hono } from 'hono'
import { getSession } from '../session/store'
import { runAgentStream } from '../agent/stream'
import logger from '../logger'

const chat = new Hono()

chat.post('/', async (c) => {
  const body = await c.req.json<{ sessionId: string; message: string }>()
  const session = await getSession(body.sessionId)
  if (!session) return c.json({ error: 'Session not found' }, 404)
  logger.info('chat request', { sessionId: body.sessionId, messageLength: body.message.length })
  try {
    return await runAgentStream(session, body.message)
  } catch (err) {
    logger.error('runAgentStream threw', { err: String(err), stack: err instanceof Error ? err.stack : undefined })
    return c.json({ error: String(err) }, 500)
  }
})

export default chat
