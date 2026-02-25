import type { Context, Next } from 'hono'
import { getSession } from './store'

/** Hono middleware — loads session by sessionId from body or query and attaches to context. */
export async function sessionMiddleware(c: Context, next: Next): Promise<void> {
  let sessionId: string | undefined

  const query = c.req.query('sessionId')
  if (query) {
    sessionId = query
  } else {
    try {
      const body = await c.req.json<{ sessionId?: string }>()
      sessionId = body.sessionId
    } catch {
      // body may not be JSON or already consumed
    }
  }

  if (sessionId) {
    const session = await getSession(sessionId)
    if (session) {
      c.set('session', session)
    }
  }

  await next()
}
