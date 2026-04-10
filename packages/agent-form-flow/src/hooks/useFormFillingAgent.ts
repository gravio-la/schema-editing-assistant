import { useChat } from '@ai-sdk/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { ClarificationPayload, ChatMessageData } from '@graviola/agent-chat-components'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type HttpChatTransportInitOptions,
  type UIMessage,
} from 'ai'

function resolveChatApiUrl(serverUrl: string): string {
  const trimmed = serverUrl.replace(/\/+$/, '')
  if (trimmed.endsWith('/api/chat')) return trimmed
  return `${trimmed}/api/chat`
}
import type {
  UseFormFillingAgentOptions,
  UseFormFillingAgentReturn,
  ToolResult,
} from '../types'

/**
 * React hook for integrating the AI form-filling assistant.
 *
 * Wraps AI SDK useChat with form-filling-specific tool dispatch.
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
  }, [
    onSetFieldValue,
    onSetMultipleFields,
    onQueryOptions,
    onSearchOptions,
    onSelectReference,
    onCreateEntity,
    onValidateForm,
    onGetFormState,
  ])

  const formDataRef = useRef(formData)
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  const schemaRef = useRef({ jsonSchema, uiSchema })
  useEffect(() => {
    schemaRef.current = { jsonSchema, uiSchema }
  }, [jsonSchema, uiSchema])

  const entityTypeRef = useRef(entityType)
  useEffect(() => {
    entityTypeRef.current = entityType
  }, [entityType])

  const metadataRef = useRef(metadata)
  useEffect(() => {
    metadataRef.current = metadata
  }, [metadata])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: resolveChatApiUrl(serverUrl),
        body: { sessionId },
        prepareSendMessagesRequest: (({ body, messages }) => ({
          body: {
            ...body,
            messages,
            sessionId,
            schema: {
              jsonSchema: schemaRef.current.jsonSchema,
              ...(schemaRef.current.uiSchema !== undefined ? { uiSchema: schemaRef.current.uiSchema } : {}),
            },
            formData: formDataRef.current,
            ...(entityTypeRef.current !== undefined ? { entityType: entityTypeRef.current } : {}),
            ...(metadataRef.current !== undefined ? { metadata: metadataRef.current } : {}),
          },
        })) as NonNullable<HttpChatTransportInitOptions<UIMessage>['prepareSendMessagesRequest']>,
      }),
    [serverUrl, sessionId],
  )

  const { messages, sendMessage, addToolOutput, status, error } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      const cb = callbacksRef.current
      const name = toolCall.toolName
      const args = toolCall.input as Record<string, unknown>

      if (name === 'request_clarification') return

      const finish = async (result: ToolResult) => {
        await addToolOutput({
          toolCallId: toolCall.toolCallId,
          tool: name,
          output: result,
        } as Parameters<typeof addToolOutput>[0])
      }

      try {
        switch (name) {
          case 'set_field_value': {
            await cb.onSetFieldValue(args['path'] as string, args['value'])
            await finish({ success: true })
            return
          }

          case 'set_multiple_fields': {
            const fields = args['fields'] as Array<{ path: string; value: unknown }>
            if (cb.onSetMultipleFields) {
              await cb.onSetMultipleFields(fields)
            } else {
              for (const field of fields) {
                await cb.onSetFieldValue(field.path, field.value)
              }
            }
            await finish({ success: true, message: `Set ${fields.length} fields` })
            return
          }

          case 'query_reference_options': {
            if (!cb.onQueryOptions) {
              await finish({
                success: false,
                error: 'No query handler registered. Reference option querying is not available.',
              })
              return
            }
            const options = await cb.onQueryOptions(
              args['referenceType'] as string,
              args['limit'] as number | undefined,
            )
            await finish({ success: true, data: options })
            return
          }

          case 'search_reference_options': {
            if (!cb.onSearchOptions) {
              await finish({
                success: false,
                error: 'No search handler registered. Reference option searching is not available.',
              })
              return
            }
            const results = await cb.onSearchOptions(
              args['referenceType'] as string,
              args['query'] as string,
              args['limit'] as number | undefined,
            )
            await finish({ success: true, data: results })
            return
          }

          case 'select_reference': {
            if (cb.onSelectReference) {
              await cb.onSelectReference(
                args['path'] as string,
                args['referenceId'] as string,
                args['referenceLabel'] as string,
              )
            } else {
              await cb.onSetFieldValue(args['path'] as string, args['referenceId'])
            }
            await finish({ success: true })
            return
          }

          case 'create_entity': {
            if (!cb.onCreateEntity) {
              await finish({
                success: false,
                error: 'Entity creation is not available. No creation handler registered.',
              })
              return
            }
            const created = await cb.onCreateEntity(
              args['entityType'] as string,
              args['data'] as Record<string, unknown>,
            )
            await finish({ success: true, data: created })
            return
          }

          case 'validate_form': {
            if (!cb.onValidateForm) {
              await finish({
                success: true,
                data: { valid: true, message: 'No validator registered — assuming valid.' },
              })
              return
            }
            const validation = await cb.onValidateForm()
            await finish({ success: true, data: validation })
            return
          }

          case 'get_form_state': {
            const state = cb.onGetFormState?.() ?? formDataRef.current
            await finish({ success: true, data: state })
            return
          }

          default:
            await finish({ success: false, error: `Unknown tool: ${name}` })
        }
      } catch (err) {
        await finish({ success: false, error: String(err) })
      }
    },
    ...(onError !== undefined ? { onError } : {}),
  })

  const sendMessageText = useCallback(
    (text: string) => {
      void sendMessage({ text })
    },
    [sendMessage],
  )

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant')
  const clarificationPart = lastAssistantMessage?.parts.find((p) => {
    if (p.type !== 'tool-request_clarification') return false
    return 'state' in p && p.state === 'input-available'
  }) as
    | {
        toolCallId: string
        input: { question: string; options?: string[]; context?: string }
      }
    | undefined

  const pendingClarification: ClarificationPayload | null = clarificationPart
    ? {
        question: clarificationPart.input.question,
        ...(clarificationPart.input.options !== undefined
          ? { options: clarificationPart.input.options }
          : {}),
        ...(clarificationPart.input.context !== undefined
          ? { context: clarificationPart.input.context }
          : {}),
        _toolCallId: clarificationPart.toolCallId,
      } as any
    : null

  const answerClarificationWithId = useCallback(
    (answer: string) => {
      if (pendingClarification) {
        void addToolOutput({
          toolCallId: (pendingClarification as any)._toolCallId,
          tool: 'request_clarification',
          output: answer,
        } as Parameters<typeof addToolOutput>[0])
      }
    },
    [pendingClarification, addToolOutput],
  )

  const chatMessages: ChatMessageData[] = messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join(''),
  }))

  const isBusy = status === 'streaming' || status === 'submitted'
  const agentStatus = error ? 'error' : isBusy ? 'thinking' : 'idle'
  const lastMessage = messages[messages.length - 1]
  const streamingMessageId =
    isBusy && lastMessage?.role === 'assistant' ? lastMessage.id : undefined

  return {
    messages: chatMessages,
    sendMessage: sendMessageText,
    isStreaming: isBusy,
    streamingMessageId,
    pendingClarification,
    answerClarification: answerClarificationWithId,
    agentStatus: agentStatus as 'idle' | 'thinking' | 'streaming' | 'error',
  }
}
