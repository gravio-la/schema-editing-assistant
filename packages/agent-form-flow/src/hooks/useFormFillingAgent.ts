import { useChat } from 'ai/react'
import { useState, useCallback, useEffect, useRef } from 'react'
import type { ClarificationPayload, ChatMessageData } from '@graviola/agent-chat-components'
import type {
  UseFormFillingAgentOptions,
  UseFormFillingAgentReturn,
  ToolResult,
} from '../types'

/**
 * React hook for integrating the AI form-filling assistant.
 *
 * Wraps Vercel AI SDK's useChat with form-filling-specific tool dispatch.
 * All tools are executed client-side via callbacks provided by the consumer.
 */
export function useFormFillingAgent({
  serverUrl,
  sessionId,
  jsonSchema,
  uiSchema,
  formData,
  entityType,
  onSetFieldValue,
  onSetMultipleFields,
  onQueryOptions,
  onSearchOptions,
  onSelectReference,
  onCreateEntity,
  onValidateForm,
  onGetFormState,
  metadata,
  onError,
}: UseFormFillingAgentOptions): UseFormFillingAgentReturn {
  // Keep stable refs so onToolCall closure always reads latest values
  const callbacksRef = useRef({
    onSetFieldValue,
    onSetMultipleFields,
    onQueryOptions,
    onSearchOptions,
    onSelectReference,
    onCreateEntity,
    onValidateForm,
    onGetFormState,
  })
  useEffect(() => {
    callbacksRef.current = {
      onSetFieldValue,
      onSetMultipleFields,
      onQueryOptions,
      onSearchOptions,
      onSelectReference,
      onCreateEntity,
      onValidateForm,
      onGetFormState,
    }
  }, [onSetFieldValue, onSetMultipleFields, onQueryOptions, onSearchOptions, onSelectReference, onCreateEntity, onValidateForm, onGetFormState])

  const formDataRef = useRef(formData)
  useEffect(() => { formDataRef.current = formData }, [formData])

  const schemaRef = useRef({ jsonSchema, uiSchema })
  useEffect(() => { schemaRef.current = { jsonSchema, uiSchema } }, [jsonSchema, uiSchema])

  const { messages, append, addToolResult, isLoading, error } = useChat({
    api: `${serverUrl}/api/chat`,
    body: {
      sessionId,
      schema: { jsonSchema, ...(uiSchema !== undefined ? { uiSchema } : {}) },
      formData,
      ...(entityType !== undefined ? { entityType } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    },
    maxSteps: 25,

    async onToolCall({ toolCall }) {
      const cb = callbacksRef.current
      const args = toolCall.args as Record<string, unknown>

      try {
        switch (toolCall.toolName) {
          case 'request_clarification':
            // Defer to UI — returning undefined keeps the tool in 'call' state
            return undefined

          case 'set_field_value': {
            await cb.onSetFieldValue(args['path'] as string, args['value'])
            return { success: true } satisfies ToolResult
          }

          case 'set_multiple_fields': {
            const fields = args['fields'] as Array<{ path: string; value: unknown }>
            if (cb.onSetMultipleFields) {
              await cb.onSetMultipleFields(fields)
            } else {
              // Fallback: set fields one by one
              for (const field of fields) {
                await cb.onSetFieldValue(field.path, field.value)
              }
            }
            return { success: true, message: `Set ${fields.length} fields` } satisfies ToolResult
          }

          case 'query_reference_options': {
            if (!cb.onQueryOptions) {
              return { success: false, error: 'No query handler registered. Reference option querying is not available.' } satisfies ToolResult
            }
            const options = await cb.onQueryOptions(
              args['referenceType'] as string,
              args['limit'] as number | undefined,
            )
            return { success: true, data: options } satisfies ToolResult
          }

          case 'search_reference_options': {
            if (!cb.onSearchOptions) {
              return { success: false, error: 'No search handler registered. Reference option searching is not available.' } satisfies ToolResult
            }
            const results = await cb.onSearchOptions(
              args['referenceType'] as string,
              args['query'] as string,
              args['limit'] as number | undefined,
            )
            return { success: true, data: results } satisfies ToolResult
          }

          case 'select_reference': {
            if (cb.onSelectReference) {
              await cb.onSelectReference(
                args['path'] as string,
                args['referenceId'] as string,
                args['referenceLabel'] as string,
              )
            } else {
              // Fallback: use onSetFieldValue with the reference ID
              await cb.onSetFieldValue(args['path'] as string, args['referenceId'])
            }
            return { success: true } satisfies ToolResult
          }

          case 'create_entity': {
            if (!cb.onCreateEntity) {
              return { success: false, error: 'Entity creation is not available. No creation handler registered.' } satisfies ToolResult
            }
            const created = await cb.onCreateEntity(
              args['entityType'] as string,
              args['data'] as Record<string, unknown>,
            )
            return { success: true, data: created } satisfies ToolResult
          }

          case 'validate_form': {
            if (!cb.onValidateForm) {
              return { success: true, data: { valid: true, message: 'No validator registered — assuming valid.' } } satisfies ToolResult
            }
            const validation = await cb.onValidateForm()
            return { success: true, data: validation } satisfies ToolResult
          }

          case 'get_form_state': {
            const state = cb.onGetFormState?.() ?? formDataRef.current
            return { success: true, data: state } satisfies ToolResult
          }

          default:
            return { success: false, error: `Unknown tool: ${toolCall.toolName}` } satisfies ToolResult
        }
      } catch (err) {
        return { success: false, error: String(err) } satisfies ToolResult
      }
    },

    ...(onError !== undefined ? { onError } : {}),
  })

  const sendMessage = useCallback(
    (text: string) => {
      const snap = schemaRef.current
      void append(
        { role: 'user', content: text },
        {
          body: {
            sessionId,
            schema: snap,
            formData: formDataRef.current,
            ...(entityType !== undefined ? { entityType } : {}),
            ...(metadata !== undefined ? { metadata } : {}),
          },
        },
      )
    },
    [append, sessionId, entityType, metadata],
  )

  const answerClarification = useCallback(
    (toolCallId: string, answer: string) => {
      addToolResult({ toolCallId, result: answer })
    },
    [addToolResult],
  )

  // Derive pendingClarification from the last assistant message
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

  const answerClarificationWithId = useCallback(
    (answer: string) => {
      if (pendingClarification) {
        answerClarification((pendingClarification as any)._toolCallId, answer)
      }
    },
    [pendingClarification, answerClarification],
  )

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
