import { Hono } from 'hono'
import { getSession, saveSession } from '../session/store'

const schema = new Hono()

/** GET /api/schema/:sessionId — deliver full jsonSchema + uiSchema + version to client */
schema.get('/:sessionId', async (c) => {
  const s = await getSession(c.req.param('sessionId'))
  if (!s) return c.json({ error: 'Not found' }, 404)
  return c.json(s.schemaState)
})

/** PUT /api/schema/:sessionId — full replace from external editor */
schema.put('/:sessionId', async (c) => {
  const s = await getSession(c.req.param('sessionId'))
  if (!s) return c.json({ error: 'Not found' }, 404)
  const body = await c.req.json<{
    jsonSchema?: Record<string, unknown>
    uiSchema?: Record<string, unknown>
  }>()
  s.schemaState = {
    jsonSchema: body.jsonSchema ?? s.schemaState.jsonSchema,
    uiSchema: body.uiSchema ?? s.schemaState.uiSchema,
    version: s.schemaState.version + 1,
  }
  s.updatedAt = new Date().toISOString()
  await saveSession(s)
  return c.json(s.schemaState)
})

export default schema
