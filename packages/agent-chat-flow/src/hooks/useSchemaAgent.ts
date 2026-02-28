import { useChat } from 'ai/react'
import { useState, useCallback, useEffect, useRef } from 'react'
import type { ClarificationPayload, ChatMessageData } from '@graviola/agent-chat-components'

type SelectedUISchemaElement = any

export interface ToolResult {
  success: boolean
  message?: string
  error?: string
}

interface UseSchemaAgentOptions {
  serverUrl: string
  sessionId: string
  /** Currently selected/focused element in the form editor. When set, the agent
   *  uses it to resolve implicit spatial references in the user's message. */
  selectedElement?: SelectedUISchemaElement
  /** Current schema snapshot from the consumer's store.
   *  Sent with every message so the server system prompt reflects live state.
   *  Only needs to be the current schema — not updated by agent tool calls. */
  schema?: {
    jsonSchema: Record<string, unknown>
    uiSchema: Record<string, unknown>
  }
  /** Called for every schema-editing tool call (add_field, add_layout, etc.).
   *  The consumer dispatches to its own store (e.g. Redux).
   *  Return a ToolResult — on error the LLM receives the error and self-corrects. */
  onExecuteTool?: (toolName: string, args: Record<string, unknown>) => ToolResult | Promise<ToolResult>
  onError?: (error: Error) => void
}

interface UseSchemaAgentReturn {
  messages: ChatMessageData[]
  sendMessage: (text: string) => void
  isStreaming: boolean
  streamingMessageId: string | undefined
  pendingClarification: ClarificationPayload | null
  answerClarification: (answer: string) => void
  agentStatus: 'idle' | 'thinking' | 'streaming' | 'error'
}

export function useSchemaAgent({
  serverUrl,
  sessionId,
  selectedElement,
  schema,
  onExecuteTool,
  onError,
}: UseSchemaAgentOptions): UseSchemaAgentReturn {
  // Keep stable refs so onToolCall closure always reads latest values
  const onExecuteToolRef = useRef(onExecuteTool)
  useEffect(() => { onExecuteToolRef.current = onExecuteTool }, [onExecuteTool])

  const selectedElementRef = useRef<SelectedUISchemaElement | undefined>(selectedElement)
  useEffect(() => { selectedElementRef.current = selectedElement }, [selectedElement])

  const schemaRef = useRef(schema)
  useEffect(() => { schemaRef.current = schema }, [schema])

  const { messages, append, addToolResult, isLoading, error } = useChat({
    api: `${serverUrl}/api/chat`,
    // Include schema + selectedElement in the static body so that ALL requests
    // (including automatic tool-result continuation requests from maxSteps) send
    // the current schema. useChat reads body from the latest render via an
    // internal ref, so updates propagate as the parent re-renders.
    body: {
      sessionId,
      ...(schema !== undefined ? { schema } : {}),
      ...(selectedElement !== undefined ? { selectedElement } : {}),
    },
    maxSteps: 25,

    /** Client-side tool execution: all schema-editing tools are dispatched here.
     *  request_clarification is intentionally NOT handled here — returning
     *  undefined causes useChat to keep the tool in 'call' state so the
     *  ClarificationCard renders and the user answers via addToolResult. */
    async onToolCall({ toolCall }) {
      console.log('[agent-chat-flow] onToolCall', {
        tool: toolCall.toolName,
        args: toolCall.args,
        schemaAtCallTime: schemaRef.current
          ? {
              propertyCount: Object.keys((schemaRef.current.jsonSchema as any)?.properties ?? {}).length,
              uiElementCount: ((schemaRef.current.uiSchema as any)?.elements ?? []).length,
            }
          : null,
      })

      if (toolCall.toolName === 'request_clarification') {
        console.log('[agent-chat-flow] request_clarification — deferring to UI')
        return undefined
      }

      const executor = onExecuteToolRef.current
      if (!executor) {
        const err = { success: false, error: `No executor registered for tool ${toolCall.toolName}` }
        console.warn('[agent-chat-flow] no executor', err)
        return err
      }

      try {
        const result = await executor(toolCall.toolName, toolCall.args as Record<string, unknown>)
        console.log('[agent-chat-flow] tool result', { tool: toolCall.toolName, result })
        return result
      } catch (err) {
        const errResult = { success: false, error: String(err) }
        console.error('[agent-chat-flow] tool threw', { tool: toolCall.toolName, err: String(err) })
        return errResult
      }
    },

    ...(onError !== undefined ? { onError } : {}),
  })

  // Also pass schema per-message for the initial user send (belt-and-suspenders,
  // since the static body above covers continuations).
  const sendMessage = useCallback((text: string) => {
    const sel = selectedElementRef.current
    const snap = schemaRef.current
    console.log('[agent-chat-flow] sendMessage', {
      text,
      schemaPropertyCount: snap ? Object.keys((snap.jsonSchema as any)?.properties ?? {}).length : null,
      hasSelectedElement: sel !== undefined,
    })
    void append(
      { role: 'user', content: text },
      {
        body: {
          sessionId,
          ...(snap !== undefined ? { schema: snap } : {}),
          ...(sel !== undefined ? { selectedElement: sel } : {}),
        },
      },
    )
  }, [append, sessionId])

  const answerClarification = useCallback((toolCallId: string, answer: string) => {
    addToolResult({ toolCallId, result: answer })
  }, [addToolResult])

  // Derive pendingClarification from the last assistant message's tool-invocation parts
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant')
  const clarificationPart = (lastAssistantMessage as any)?.parts?.find(
    (p: any) =>
      p.type === 'tool-invocation' &&
      p.toolInvocation?.toolName === 'request_clarification' &&
      p.toolInvocation?.state === 'call',
  )

  const pendingClarification: ClarificationPayload | null = clarificationPart
    ? {
        question: clarificationPart.toolInvocation.args.question,
        ...(clarificationPart.toolInvocation.args.options !== undefined
          ? { options: clarificationPart.toolInvocation.args.options }
          : {}),
        ...(clarificationPart.toolInvocation.args.context !== undefined
          ? { context: clarificationPart.toolInvocation.args.context }
          : {}),
        _toolCallId: clarificationPart.toolInvocation.toolCallId,
      } as any
    : null

  // Wrap answerClarification to include the toolCallId from pendingClarification
  const answerClarificationWithId = useCallback((answer: string) => {
    if (pendingClarification) {
      answerClarification((pendingClarification as any)._toolCallId, answer)
    }
  }, [pendingClarification, answerClarification])

  const chatMessages: ChatMessageData[] = messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: typeof m.content === 'string' ? m.content : '',
    ...(m.createdAt !== undefined ? { createdAt: m.createdAt.toISOString() } : {}),
  }))

  const agentStatus = error ? 'error' : isLoading ? 'thinking' : 'idle'

  const lastMessage = messages[messages.length - 1]
  const streamingMessageId =
    isLoading && lastMessage?.role === 'assistant' ? lastMessage.id : undefined

  return {
    messages: chatMessages,
    sendMessage,
    isStreaming: isLoading,
    streamingMessageId,
    pendingClarification,
    answerClarification: answerClarificationWithId,
    agentStatus: agentStatus as 'idle' | 'thinking' | 'streaming' | 'error',
  }
}
