import { useState } from 'react'
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
  children: ReactNode
}

export function AgentChatProvider({ serverUrl, sessionId, onSchemaUpdate, selectedElement, children }: AgentChatProviderProps) {
  const [schemaVersion, setSchemaVersion] = useState(0)

  const { messages, sendMessage, isStreaming, pendingClarification, answerClarification, agentStatus } =
    useSchemaAgent({
      serverUrl,
      sessionId,
      ...(selectedElement !== undefined ? { selectedElement } : {}),
    })

  useSchemaSync({
    serverUrl,
    sessionId,
    schemaVersion,
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
        pendingClarification={pendingClarification}
        onAnswerClarification={answerClarification}
        agentStatus={agentStatus}
      />
    </>
  )
}
