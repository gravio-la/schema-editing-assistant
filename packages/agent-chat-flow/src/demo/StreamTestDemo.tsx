import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useMemo, useState } from 'react'
import { StreamTestDisplay } from '@graviola/agent-chat-components'
import { resolveChatApiUrl, resolveServerOrigin } from '../utils/resolve-chat-api-url'

export interface StreamTestDemoProps {
  /** Dev server origin (`http://localhost:3001`) or full chat URL (`…/api/chat`). */
  serverUrl?: string
  /** If set, skips POST /api/session and uses this id (must exist in Redis). */
  sessionId?: string
}

function StreamTestChat({
  serverUrl,
  sessionId,
}: {
  serverUrl: string
  sessionId: string
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: resolveChatApiUrl(serverUrl),
        body: { sessionId },
      }),
    [serverUrl, sessionId],
  )
  const { messages, sendMessage, status, error } = useChat({ transport })
  const [input, setInput] = useState('')

  const isLoading = status === 'streaming' || status === 'submitted'

  return (
    <StreamTestDisplay
      messages={messages.map((m) => ({
        id: m.id,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.parts
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
          .map((p) => p.text)
          .join(''),
      }))}
      input={input}
      isLoading={isLoading}
      error={error?.message}
      onInputChange={(v: string) => setInput(v)}
      onSubmit={() => {
        const t = input.trim()
        if (!t) return
        void sendMessage({ text: t })
        setInput('')
      }}
    />
  )
}

export function StreamTestDemo({
  serverUrl = 'http://localhost:3001',
  sessionId: sessionIdProp,
}: StreamTestDemoProps) {
  const [sessionId, setSessionId] = useState<string | null>(sessionIdProp ?? null)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionIdProp != null) {
      setSessionId(sessionIdProp)
      return
    }
    const base = resolveServerOrigin(serverUrl)
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`${base}/api/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: 'en' }),
        })
        if (!res.ok) throw new Error(`POST /api/session ${res.status}`)
        const data = (await res.json()) as { sessionId: string }
        if (!cancelled) setSessionId(data.sessionId)
      } catch (e) {
        if (!cancelled) setSessionError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [serverUrl, sessionIdProp])

  if (sessionError != null) {
    return (
      <StreamTestDisplay
        messages={[]}
        input=""
        isLoading={false}
        error={sessionError}
        onInputChange={() => {}}
        onSubmit={() => {}}
      />
    )
  }

  if (sessionId == null) {
    return (
      <StreamTestDisplay
        messages={[]}
        input=""
        isLoading
        onInputChange={() => {}}
        onSubmit={() => {}}
      />
    )
  }

  return <StreamTestChat serverUrl={serverUrl} sessionId={sessionId} />
}
