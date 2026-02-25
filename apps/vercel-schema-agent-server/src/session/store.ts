import type { Session } from './types'
import { SessionSchema } from './types'
import redis from '../redis'
import logger from '../logger'

const SESSION_TTL = 86400

const key = (id: string) => `session:${id}`

/** Load a session from Redis. Returns null if not found or parse fails. */
export async function getSession(id: string): Promise<Session | null> {
  const raw = await redis.get(key(id))
  if (!raw) return null
  try {
    return SessionSchema.parse(JSON.parse(raw))
  } catch (err) {
    logger.warn('session parse failed', { id, err })
    return null
  }
}

/** Persist a session to Redis with a 24-hour TTL. */
export async function saveSession(session: Session): Promise<void> {
  await redis.setex(key(session.id), SESSION_TTL, JSON.stringify(session))
}

/** Delete a session from Redis. */
export async function deleteSession(id: string): Promise<void> {
  await redis.del(key(id))
}
