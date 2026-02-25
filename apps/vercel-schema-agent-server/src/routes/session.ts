import { Hono } from 'hono'
import type { Session } from '../session/types'
import { getSession, saveSession, deleteSession } from '../session/store'

const session = new Hono()

/** POST /api/session — create a new session with empty JSON Schema + UI Schema */
session.post('/', async (c) => {
  const body = await c.req.json<{ language?: 'de' | 'en' }>().catch(() => ({}))
  const newSession: Session = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    schemaState: {
      jsonSchema: { type: 'object', properties: {}, required: [] },
      uiSchema: {},
      version: 0,
    },
    language: (body as { language?: 'de' | 'en' }).language ?? 'en',
  }
  await saveSession(newSession)
  return c.json({ sessionId: newSession.id, session: newSession })
})

/** GET /api/session/:id — re-attach to an existing session */
session.get('/:id', async (c) => {
  const s = await getSession(c.req.param('id'))
  if (!s) return c.json({ error: 'Not found' }, 404)
  return c.json(s)
})

/** DELETE /api/session/:id */
session.delete('/:id', async (c) => {
  await deleteSession(c.req.param('id'))
  return c.json({ ok: true })
})

export default session
