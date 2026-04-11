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
  /** Uncontrolled: open panel on first render (ignored when `panelOpen` is set). */
  defaultOpen?: boolean
  /** Controlled panel visibility — use with `onPanelOpenChange` (e.g. from `AiAssistantProvider`). */
  panelOpen?: boolean
  onPanelOpenChange?: (open: boolean) => void
  /** Seeded as the first assistant `UIMessage` when the chat is created (per session). */
  welcomeMessage?: string
  /** Passed to `AgentFAB`: icon when the chat panel is closed. */
  collapsedFabIcon?: ReactNode
  children: ReactNode
}

export function AgentChatProvider({
  serverUrl,
  sessionId,
  schema,
  onExecuteTool,
  selectedElement,
  defaultOpen,
  panelOpen,
  onPanelOpenChange,
  welcomeMessage,
  collapsedFabIcon,
  children,
}: AgentChatProviderProps) {
  const {
    messages,
    sendMessage,
    isStreaming,
    streamingMessageId,
    pendingClarification,
    answerClarification,
    pendingFormReplacement,
    confirmFormReplacement,
    agentStatus,
  } = useSchemaAgent({
    serverUrl,
    sessionId,
    ...(schema !== undefined ? { schema } : {}),
    ...(onExecuteTool !== undefined ? { onExecuteTool } : {}),
    ...(selectedElement !== undefined ? { selectedElement } : {}),
    ...(welcomeMessage !== undefined ? { welcomeMessage } : {}),
  })

  return (
    <>
      {children}
      <AgentFAB
        key={sessionId}
        messages={messages}
        onSend={sendMessage}
        isStreaming={isStreaming}
        {...(streamingMessageId !== undefined ? { streamingMessageId } : {})}
        pendingClarification={pendingClarification}
        onAnswerClarification={answerClarification}
        pendingFormReplacement={pendingFormReplacement}
        onConfirmFormReplacement={confirmFormReplacement}
        agentStatus={agentStatus}
        {...(panelOpen !== undefined && onPanelOpenChange !== undefined
          ? { open: panelOpen, onOpenChange: onPanelOpenChange }
          : defaultOpen !== undefined
            ? { defaultOpen }
            : {})}
        {...(collapsedFabIcon !== undefined ? { collapsedFabIcon } : {})}
      />
    </>
  )
}
