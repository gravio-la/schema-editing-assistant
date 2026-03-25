import redis from '../redis'
import { SessionSchema, type Session } from './types'
import logger from '../logger'

const SESSION_TTL = 86400 // 24 hours

function sessionKey(id: string): string {
  return `form-session:${id}`
}

export async function getSession(id: string): Promise<Session | null> {
  try {
    const raw = await redis.get(sessionKey(id))
    if (!raw) return null
    return SessionSchema.parse(JSON.parse(raw))
  } catch (err) {
    logger.warn('Failed to parse session', { id, err: String(err) })
    return null
  }
}

export async function saveSession(session: Session): Promise<void> {
  const data = JSON.stringify(session)
  await redis.set(sessionKey(session.id), data, 'EX', SESSION_TTL)
}

export async function deleteSession(id: string): Promise<void> {
  await redis.del(sessionKey(id))
}
