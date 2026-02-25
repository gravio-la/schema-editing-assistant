import { useChat } from 'ai/react'
import { useState, useCallback, useEffect, useRef } from 'react'
import type { ClarificationPayload, ChatMessageData } from '@graviola/agent-chat-components'

type SelectedUISchemaElement = any

interface UseSchemaAgentOptions {
  serverUrl: string
  sessionId: string
  /** Currently selected/focused element in the form editor. When set, the agent
   *  uses it to resolve implicit spatial references in the user's message
   *  ("here", "this field", "into the selected group", etc.). */
  selectedElement?: SelectedUISchemaElement
  onError?: (error: Error) => void
}

interface UseSchemaAgentReturn {
  messages: ChatMessageData[]
  sendMessage: (text: string) => void
  isStreaming: boolean
  pendingClarification: ClarificationPayload | null
  answerClarification: (answer: string) => void
  agentStatus: 'idle' | 'thinking' | 'streaming' | 'error'
}

type ClarificationEvent = { type?: string; question?: string; options?: string[]; context?: string }

export function useSchemaAgent({ serverUrl, sessionId, selectedElement, onError }: UseSchemaAgentOptions): UseSchemaAgentReturn {
  const [pendingClarification, setPendingClarification] = useState<ClarificationPayload | null>(null)
  // Tracks whether the user has already answered the current clarification.
  // Reset to false whenever a new (additional) clarification event arrives.
  const [clarificationAnswered, setClarificationAnswered] = useState(false)
  const prevClarificationCountRef = useRef(0)

  // Keep a ref to the latest selectedElement so sendMessage/answerClarification
  // can snapshot it at call time without being listed as a dependency.
  const selectedElementRef = useRef<SelectedUISchemaElement | undefined>(selectedElement)
  useEffect(() => {
    selectedElementRef.current = selectedElement
  }, [selectedElement])

  const { messages, append, isLoading, data, error } = useChat({
    api: `${serverUrl}/api/chat`,
    body: { sessionId },
    ...(onError !== undefined ? { onError } : {}),
  })

  // Count clarification events in the data stream.
  const clarificationEvents = (data as ClarificationEvent[] | undefined)
    ?.filter((d) => d?.type === 'clarification') ?? []
  const clarificationCount = clarificationEvents.length
  const latestClarification = clarificationEvents[clarificationCount - 1] ?? null

  // When a new clarification event arrives, un-dismiss the card.
  useEffect(() => {
    if (clarificationCount > prevClarificationCountRef.current) {
      setClarificationAnswered(false)
    }
    prevClarificationCountRef.current = clarificationCount
  }, [clarificationCount])

  const effectiveClarification: ClarificationPayload | null =
    !clarificationAnswered && latestClarification?.question
      ? {
          question: latestClarification.question,
          ...(latestClarification.options !== undefined ? { options: latestClarification.options } : {}),
          ...(latestClarification.context !== undefined ? { context: latestClarification.context } : {}),
        }
      : !clarificationAnswered
      ? pendingClarification
      : null

  const sendMessage = useCallback((text: string) => {
    setPendingClarification(null)
    setClarificationAnswered(false)
    const sel = selectedElementRef.current
    void append(
      { role: 'user', content: text },
      sel !== undefined ? { body: { sessionId, selectedElement: sel } } : undefined,
    )
  }, [append, sessionId])

  const answerClarification = useCallback((answer: string) => {
    // Dismiss the card immediately — the answer appears as a user chat bubble
    // because append() adds it to the messages array.
    setClarificationAnswered(true)
    setPendingClarification(null)
    // Clarification answers never carry a selection context — the user is
    // responding to an explicit question, not referencing an editor element.
    void append({ role: 'user', content: answer })
  }, [append])

  const chatMessages: ChatMessageData[] = messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: typeof m.content === 'string' ? m.content : '',
    ...(m.createdAt !== undefined ? { createdAt: m.createdAt.toISOString() } : {}),
  }))

  const agentStatus = error ? 'error' : isLoading ? 'thinking' : 'idle'

  return {
    messages: chatMessages,
    sendMessage,
    isStreaming: isLoading,
    pendingClarification: effectiveClarification,
    answerClarification,
    agentStatus: agentStatus as 'idle' | 'thinking' | 'streaming' | 'error',
  }
}
