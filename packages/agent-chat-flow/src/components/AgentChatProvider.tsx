import { useState } from 'react'
import type { ReactNode } from 'react'
import { AgentFAB } from '@graviola/agent-chat-components'
import { useSchemaAgent } from '../hooks/useSchemaAgent'
import { useSchemaSync } from '../hooks/useSchemaSync'
import type { SchemaState } from '../hooks/useSchemaSync'

interface AgentChatProviderProps {
  serverUrl: string
  sessionId: string
  onSchemaUpdate?: (schemaState: SchemaState) => void
  children: ReactNode
}

export function AgentChatProvider({ serverUrl, sessionId, onSchemaUpdate, children }: AgentChatProviderProps) {
  const [schemaVersion, setSchemaVersion] = useState(0)

  const { messages, sendMessage, isStreaming, pendingClarification, answerClarification, agentStatus } =
    useSchemaAgent({ serverUrl, sessionId })

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
