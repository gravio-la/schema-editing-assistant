import React, { useEffect, type ReactNode } from 'react'
import { useFormFillingAgent } from '../hooks/useFormFillingAgent'
import { useFormAgentSession } from '../hooks/useFormAgentSession'
import type { UseFormFillingAgentOptions } from '../types'

type FormAgentProviderProps = Omit<UseFormFillingAgentOptions, 'sessionId'> & {
  /** Language for the assistant session. */
  language?: 'de' | 'en'
  /** Render prop receiving the agent API. */
  children: (agent: ReturnType<typeof useFormFillingAgent> & {
    sessionId: string | null
    isSessionCreating: boolean
  }) => ReactNode
}

/**
 * Provider component that manages session lifecycle and exposes the
 * form-filling agent API via render props.
 *
 * Usage:
 * ```tsx
 * <FormAgentProvider
 *   serverUrl="http://localhost:3002"
 *   jsonSchema={schema}
 *   formData={data}
 *   onSetFieldValue={(path, value) => setData({...data, [path]: value})}
 * >
 *   {(agent) => (
 *     <>
 *       <AgentFAB messages={agent.messages} onSend={agent.sendMessage} />
 *     </>
 *   )}
 * </FormAgentProvider>
 * ```
 */
export function FormAgentProvider({
  serverUrl,
  language = 'en',
  entityType,
  children,
  ...agentOptions
}: FormAgentProviderProps) {
  const { sessionId, isCreating, createSession } = useFormAgentSession({
    serverUrl,
    language,
    entityType,
  })

  // Auto-create session on mount
  useEffect(() => {
    if (!sessionId && !isCreating) {
      void createSession()
    }
  }, [sessionId, isCreating, createSession])

  const agent = useFormFillingAgent({
    serverUrl,
    sessionId: sessionId ?? '',
    entityType,
    ...agentOptions,
  })

  return (
    <>
      {children({
        ...agent,
        sessionId,
        isSessionCreating: isCreating,
      })}
    </>
  )
}
