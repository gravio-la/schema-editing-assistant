import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { AgentFAB } from '@graviola/agent-chat-components'
import { useSchemaAgent } from '../hooks/useSchemaAgent'
import { useSchemaSync } from '../hooks/useSchemaSync'
import type { SchemaState } from '../hooks/useSchemaSync'

type SelectedUISchemaElement = any

interface AgentChatProviderProps {
  serverUrl: string
  sessionId: string
  onSchemaUpdate?: (schemaState: SchemaState) => void
  /** Currently selected/focused element in the form editor. Forwarded to the
   *  agent on each message so it can resolve relative references. */
  selectedElement?: SelectedUISchemaElement
  /** Open the chat panel immediately on first render — useful when the session
   *  was just created in response to a FAB click. */
  defaultOpen?: boolean
  children: ReactNode
}

export function AgentChatProvider({ serverUrl, sessionId, onSchemaUpdate, selectedElement, defaultOpen, children }: AgentChatProviderProps) {
  const [schemaVersion, setSchemaVersion] = useState(0)
  const [refreshToken, setRefreshToken] = useState(0)
  const prevIsStreamingRef = useRef(false)

  const { messages, sendMessage, isStreaming, streamingMessageId, pendingClarification, answerClarification, agentStatus } =
    useSchemaAgent({
      serverUrl,
      sessionId,
      ...(selectedElement !== undefined ? { selectedElement } : {}),
    })

  // When the agent stream finishes, trigger an immediate schema re-fetch
  // so the designer picks up the agent's edits without waiting for the next
  // version-change cycle.
  useEffect(() => {
    if (prevIsStreamingRef.current && !isStreaming) {
      setRefreshToken((t) => t + 1)
    }
    prevIsStreamingRef.current = isStreaming
  }, [isStreaming])

  useSchemaSync({
    serverUrl,
    sessionId,
    schemaVersion,
    refreshToken,
    onSchemaUpdate: (state) => {
      setSchemaVersion(state.version)
      onSchemaUpdate?.(state)
    },
  })

  return (
    <>
      {children}
      <AgentFAB
        messages={messages}
        onSend={sendMessage}
        isStreaming={isStreaming}
        {...(streamingMessageId !== undefined ? { streamingMessageId } : {})}
        pendingClarification={pendingClarification}
        onAnswerClarification={answerClarification}
        agentStatus={agentStatus}
        {...(defaultOpen !== undefined ? { defaultOpen } : {})}
      />
    </>
  )
}
