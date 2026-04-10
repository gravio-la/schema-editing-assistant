import { useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { AiAssistantContext } from '../context/AiAssistantContext'
import { AgentChatProvider } from './AgentChatProvider'
import type { ToolResult } from '../hooks/useSchemaAgent'
import type { AgentSessionCustomRenderer } from '../types/agent-session'

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
  /** Stored on the server session; affects system prompt language. Default `en`. */
  language?: 'de' | 'en'
  /**
   * Deployment-specific JSON Forms renderers / widgets (sent once at session creation).
   * Use a stable reference (module-level const or useMemo).
   */
  customRenderers?: AgentSessionCustomRenderer[]
  /** Shown as the first assistant message after the session is created (before any user turn). */
  welcomeMessage?: string
  /** Icon on the floating button when the panel is closed (see `AgentFAB`). */
  collapsedFabIcon?: ReactNode
  children: ReactNode
}

export function AiAssistantProvider({
  serverUrl,
  schema,
  onExecuteTool,
  selectedElement,
  language,
  customRenderers,
  welcomeMessage,
  collapsedFabIcon,
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
      const res = await fetch(`${serverUrl}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: language ?? 'en',
          ...(customRenderers !== undefined && customRenderers.length > 0
            ? { customRenderers }
            : {}),
        }),
      })
      if (!res.ok) throw new Error(`POST /api/session ${res.status}`)
      const data = (await res.json()) as { sessionId: string }

      setSessionId(data.sessionId)
      setIsOpen(true)
    } catch {
      // Session creation failed; isCreating is cleared in finally.
    } finally {
      setIsCreating(false)
    }
  }, [serverUrl, sessionId, isCreating, language, customRenderers])

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
          panelOpen={isOpen}
          onPanelOpenChange={setIsOpen}
          {...(welcomeMessage !== undefined ? { welcomeMessage } : {})}
          {...(collapsedFabIcon !== undefined ? { collapsedFabIcon } : {})}
        >
          <></>
        </AgentChatProvider>
      )}
    </AiAssistantContext.Provider>
  )
}
