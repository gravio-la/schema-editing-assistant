import { Hono } from 'hono'

/**
 * Schema registration endpoints — stubs for Mode B forward-compatibility.
 * Mode B (server-registered schemas with data layer adapters) will be
 * implemented in a future iteration.
 */
const schema = new Hono()

schema.post('/register', async (c) => {
  return c.json(
    { error: 'Schema registration (Mode B) is not yet implemented. Use Mode A by sending schema with each chat request.' },
    501,
  )
})

schema.get('/:id', async (c) => {
  return c.json(
    { error: 'Schema registry (Mode B) is not yet implemented.' },
    501,
  )
})

schema.delete('/:id', async (c) => {
  return c.json(
    { error: 'Schema registry (Mode B) is not yet implemented.' },
    501,
  )
})

export default schema
