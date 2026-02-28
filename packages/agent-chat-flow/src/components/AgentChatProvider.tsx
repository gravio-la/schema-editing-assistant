import type { ReactNode } from 'react'
import { AgentFAB } from '@graviola/agent-chat-components'
import { useSchemaAgent } from '../hooks/useSchemaAgent'
import type { ToolResult } from '../hooks/useSchemaAgent'

type SelectedUISchemaElement = any

interface AgentChatProviderProps {
  serverUrl: string
  sessionId: string
  /** Current schema from the consumer's store — sent with every message. */
  schema?: {
    jsonSchema: Record<string, unknown>
    uiSchema: Record<string, unknown>
  }
  /** Called for every schema-editing tool call. Dispatch to your store here. */
  onExecuteTool?: (toolName: string, args: Record<string, unknown>) => ToolResult | Promise<ToolResult>
  /** Currently selected/focused element in the form editor. */
  selectedElement?: SelectedUISchemaElement
  /** Open the chat panel immediately on first render. */
  defaultOpen?: boolean
  children: ReactNode
}

export function AgentChatProvider({
  serverUrl,
  sessionId,
  schema,
  onExecuteTool,
  selectedElement,
  defaultOpen,
  children,
}: AgentChatProviderProps) {
  const {
    messages,
    sendMessage,
    isStreaming,
    streamingMessageId,
    pendingClarification,
    answerClarification,
    agentStatus,
  } = useSchemaAgent({
    serverUrl,
    sessionId,
    ...(schema !== undefined ? { schema } : {}),
    ...(onExecuteTool !== undefined ? { onExecuteTool } : {}),
    ...(selectedElement !== undefined ? { selectedElement } : {}),
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
