import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { debounce } from 'lodash-es'
import { AiAssistantContext } from '../context/AiAssistantContext'
import { AgentChatProvider } from './AgentChatProvider'
import type { SchemaState } from '../hooks/useSchemaSync'

interface SchemaSnapshot {
  jsonSchema: Record<string, unknown>
  uiSchema: Record<string, unknown>
}

interface AiAssistantProviderProps {
  serverUrl: string
  /**
   * Reactive snapshot of the current form schema from the consuming app's store.
   * Changes are debounced and PUT to the server so the agent always sees the
   * latest user edits. When the agent writes back, the next PUT is suppressed
   * to prevent an echo cycle.
   */
  schema?: SchemaSnapshot
  /** Called whenever the agent modifies the schema. Wire this to your store. */
  onSchemaUpdate?: (state: SchemaState) => void
  /** Currently selected element in the form editor — forwarded to the agent. */
  selectedElement?: unknown
  children: ReactNode
}

export function AiAssistantProvider({
  serverUrl,
  schema,
  onSchemaUpdate,
  selectedElement,
  children,
}: AiAssistantProviderProps) {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [isCreating, setIsCreating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Keeps a live reference to the schema so the openChat closure always reads
  // the latest value without needing schema as a dependency.
  const schemaRef = useRef<SchemaSnapshot | undefined>(schema)
  useEffect(() => {
    schemaRef.current = schema
  }, [schema])

  // When set to true, the next debounced PUT is skipped. Prevents echoing the
  // agent's schema write back to the server and creating an infinite version loop.
  const suppressNextPutRef = useRef(false)

  // Track whether this is the very first render so we don't PUT on mount.
  const mountedRef = useRef(false)

  const debouncedPut = useMemo(
    () =>
      debounce(async (snap: SchemaSnapshot, sid: string) => {
        await fetch(`${serverUrl}/api/schema/${sid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snap),
        }).catch(() => {})
      }, 600),
    [serverUrl],
  )

  useEffect(() => {
    if (!sessionId || !schema) return
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    if (suppressNextPutRef.current) {
      suppressNextPutRef.current = false
      return
    }
    debouncedPut(schema, sessionId)
    return () => {
      debouncedPut.cancel()
    }
  }, [schema, sessionId, debouncedPut])

  const handleSchemaUpdate = useCallback(
    (state: SchemaState) => {
      suppressNextPutRef.current = true
      onSchemaUpdate?.(state)
    },
    [onSchemaUpdate],
  )

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

      const snap = schemaRef.current
      if (snap) {
        await fetch(`${serverUrl}/api/schema/${data.sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snap),
        }).catch(() => {})
      }

      // Reset the mount guard so the debounced PUT effect skips the very first
      // change that fires right after session creation (the schema hasn't changed).
      mountedRef.current = false
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
          onSchemaUpdate={handleSchemaUpdate}
          {...(selectedElement !== undefined ? { selectedElement } : {})}
          defaultOpen={isOpen}
        >
          <></>
        </AgentChatProvider>
      )}
    </AiAssistantContext.Provider>
  )
}
