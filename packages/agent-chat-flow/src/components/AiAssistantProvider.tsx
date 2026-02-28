import { useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { AiAssistantContext } from '../context/AiAssistantContext'
import { AgentChatProvider } from './AgentChatProvider'
import type { ToolResult } from '../hooks/useSchemaAgent'

interface SchemaSnapshot {
  jsonSchema: Record<string, unknown>
  uiSchema: Record<string, unknown>
}

interface AiAssistantProviderProps {
  serverUrl: string
  /**
   * Reactive snapshot of the current form schema from the consuming app's store.
   * Sent with every chat message so the server system prompt always reflects
   * the live Redux state. NOT used for two-way sync — the agent never writes
   * back to the server; it only dispatches via onExecuteTool.
   */
  schema?: SchemaSnapshot
  /**
   * Called for every schema-editing tool call the agent makes.
   * Wire this to your store's dispatch (e.g. Redux dispatch(aiAddField(...))).
   * Return { success: true } or { success: false, error: "..." } — errors are
   * fed back to the LLM for self-correction.
   */
  onExecuteTool?: (toolName: string, args: Record<string, unknown>) => ToolResult | Promise<ToolResult>
  /** Currently selected element in the form editor. Forwarded to the agent. */
  selectedElement?: unknown
  children: ReactNode
}

export function AiAssistantProvider({
  serverUrl,
  schema,
  onExecuteTool,
  selectedElement,
  children,
}: AiAssistantProviderProps) {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [isCreating, setIsCreating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const openChat = useCallback(async () => {
    if (isCreating) return
    if (sessionId) {
      setIsOpen(true)
      return
    }
    setIsCreating(true)
    try {
      const data = await fetch(`${serverUrl}/api/session`, {
        method: 'POST',
      }).then((r) => r.json() as Promise<{ sessionId: string }>)

      setSessionId(data.sessionId)
      setIsOpen(true)
    } catch {
      // leave isCreating=true so the button stays disabled rather than flashing
    } finally {
      setIsCreating(false)
    }
  }, [serverUrl, sessionId, isCreating])

  const closeChat = useCallback(() => {
    setIsOpen(false)
  }, [])

  const contextValue = useMemo(
    () => ({
      openChat,
      closeChat,
      isOpen,
      isCreating,
      sessionId,
      hasSession: sessionId !== undefined,
    }),
    [openChat, closeChat, isOpen, isCreating, sessionId],
  )

  return (
    <AiAssistantContext.Provider value={contextValue}>
      {children}
      {sessionId !== undefined && (
        <AgentChatProvider
          serverUrl={serverUrl}
          sessionId={sessionId}
          {...(schema !== undefined ? { schema } : {})}
          {...(onExecuteTool !== undefined ? { onExecuteTool } : {})}
          {...(selectedElement !== undefined ? { selectedElement } : {})}
          defaultOpen={isOpen}
        >
          <></>
        </AgentChatProvider>
      )}
    </AiAssistantContext.Provider>
  )
}
