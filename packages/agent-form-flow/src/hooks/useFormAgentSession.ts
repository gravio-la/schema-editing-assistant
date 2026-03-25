import { useState, useCallback } from 'react'

interface UseFormAgentSessionOptions {
  serverUrl: string
  language?: 'de' | 'en' | undefined
  entityType?: string | undefined
}

interface UseFormAgentSessionReturn {
  sessionId: string | null
  isCreating: boolean
  createSession: () => Promise<string>
  deleteSession: () => Promise<void>
}

/**
 * Manages form-filling agent session lifecycle.
 * Creates and deletes sessions on the graviola-ai-rest-server.
 */
export function useFormAgentSession({
  serverUrl,
  language = 'en',
  entityType,
}: UseFormAgentSessionOptions): UseFormAgentSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const createSession = useCallback(async () => {
    setIsCreating(true)
    try {
      const res = await fetch(`${serverUrl}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, entityType }),
      })
      if (!res.ok) throw new Error(`Failed to create session: ${res.status}`)
      const data = await res.json()
      const id = data.sessionId as string
      setSessionId(id)
      return id
    } finally {
      setIsCreating(false)
    }
  }, [serverUrl, language, entityType])

  const deleteSession = useCallback(async () => {
    if (!sessionId) return
    await fetch(`${serverUrl}/api/session/${sessionId}`, { method: 'DELETE' })
    setSessionId(null)
  }, [serverUrl, sessionId])

  return { sessionId, isCreating, createSession, deleteSession }
}
