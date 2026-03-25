import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { getSession, saveSession, deleteSession } from '../session/store'
import type { Session } from '../session/types'
import logger from '../logger'

const session = new Hono()

session.post('/', async (c) => {
  const body = await c.req.json<{
    language?: 'de' | 'en'
    entityType?: string
  }>().catch(() => ({}))

  const now = new Date().toISOString()
  const newSession: Session = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    messages: [],
    formData: {},
    entityType: (body as any)?.entityType,
    language: (body as any)?.language ?? 'en',
  }

  await saveSession(newSession)
  logger.info('session created', { sessionId: newSession.id, entityType: newSession.entityType })

  return c.json({ sessionId: newSession.id, session: newSession })
})

session.get('/:id', async (c) => {
  const id = c.req.param('id')
  const s = await getSession(id)
  if (!s) return c.json({ error: 'Session not found' }, 404)
  return c.json(s)
})

session.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await deleteSession(id)
  logger.info('session deleted', { sessionId: id })
  return c.json({ ok: true })
})

export default session
