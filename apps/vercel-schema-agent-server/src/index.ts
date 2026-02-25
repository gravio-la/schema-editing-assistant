import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import chat from './routes/chat'
import schema from './routes/schema'
import session from './routes/session'
import logger from './logger'
import config from './config'

const app = new Hono()

app.use('*', cors({ origin: '*' }))

app.get('/health', (c) => c.json({ ok: true }))
app.route('/api/chat', chat)
app.route('/api/schema', schema)
app.route('/api/session', session)

serve({ fetch: app.fetch, port: config.PORT }, () => {
  logger.info(`server listening on http://localhost:${config.PORT}`)
})
