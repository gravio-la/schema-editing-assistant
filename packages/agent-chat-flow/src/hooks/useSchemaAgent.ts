import { useChat } from '@ai-sdk/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type HttpChatTransportInitOptions,
  type UIMessage,
} from 'ai'
import type {
  ClarificationPayload,
  ChatMessageData,
  FormReplacementPayload,
} from '@graviola/agent-chat-components'
import { resolveChatApiUrl } from '../utils/resolve-chat-api-url'

type SelectedUISchemaElement = any

type FormReplaceToolName = 'replace_form' | 'repair_form'

function resolveFormReplaceToolName(p: { type: string; toolName?: string }): FormReplaceToolName | null {
  if (p.type === 'tool-replace_form') return 'replace_form'
  if (p.type === 'tool-repair_form') return 'repair_form'
  if (p.type === 'dynamic-tool' && p.toolName === 'replace_form') return 'replace_form'
  if (p.type === 'dynamic-tool' && p.toolName === 'repair_form') return 'repair_form'
  return null
}

/** Tool part waiting for user confirm + addToolOutput (same pattern as request_clarification). */
function findPendingFormReplacePart(parts: UIMessage['parts']):
  | {
      toolCallId: string
      toolName: FormReplaceToolName
      input: { jsonSchema: Record<string, unknown>; uiSchema: Record<string, unknown> }
    }
  | undefined {
  for (const p of parts) {
    if (typeof p.type !== 'string') continue
    const toolName = resolveFormReplaceToolName(p as { type: string; toolName?: string })
    if (!toolName) continue
    if (!('state' in p) || (p as { state: string }).state !== 'input-available') continue
    if (!('toolCallId' in p)) continue
    const raw = (p as { input?: unknown }).input
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) continue
    const jsonSchema = (raw as Record<string, unknown>)['jsonSchema']
    const uiSchema = (raw as Record<string, unknown>)['uiSchema']
    if (jsonSchema == null || typeof jsonSchema !== 'object' || Array.isArray(jsonSchema)) continue
    if (uiSchema == null || typeof uiSchema !== 'object' || Array.isArray(uiSchema)) continue
    return {
      toolCallId: (p as { toolCallId: string }).toolCallId,
      toolName,
      input: {
        jsonSchema: jsonSchema as Record<string, unknown>,
        uiSchema: uiSchema as Record<string, unknown>,
      },
    }
  }
  return undefined
}

export interface ToolResult {
  success: boolean
  message?: string
  error?: string
}

interface UseSchemaAgentOptions {
  serverUrl: string
  sessionId: string
  selectedElement?: SelectedUISchemaElement
  schema?: {
    jsonSchema: Record<string, unknown>
    uiSchema: Record<string, unknown>
  }
  onExecuteTool?: (toolName: string, args: Record<string, unknown>) => ToolResult | Promise<ToolResult>
  onError?: (error: Error) => void
  /** First assistant turn in the thread (UIMessage), shown before the user sends anything. */
  welcomeMessage?: string
}

interface UseSchemaAgentReturn {
  messages: ChatMessageData[]
  sendMessage: (text: string) => void
  isStreaming: boolean
  streamingMessageId: string | undefined
  pendingClarification: ClarificationPayload | null
  answerClarification: (answer: string) => void
  pendingFormReplacement: FormReplacementPayload | null
  confirmFormReplacement: (confirmed: boolean) => void
  agentStatus: 'idle' | 'thinking' | 'streaming' | 'error'
}

export function useSchemaAgent({
  serverUrl,
  sessionId,
  selectedElement,
  schema,
  onExecuteTool,
  onError,
  welcomeMessage,
}: UseSchemaAgentOptions): UseSchemaAgentReturn {
  const onExecuteToolRef = useRef(onExecuteTool)
  useEffect(() => {
    onExecuteToolRef.current = onExecuteTool
  }, [onExecuteTool])

  const selectedElementRef = useRef<SelectedUISchemaElement | undefined>(selectedElement)
  useEffect(() => {
    selectedElementRef.current = selectedElement
  }, [selectedElement])

  const schemaRef = useRef(schema)
  useEffect(() => {
    schemaRef.current = schema
  }, [schema])

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
            ...(schemaRef.current !== undefined ? { schema: schemaRef.current } : {}),
            ...(selectedElementRef.current !== undefined
              ? { selectedElement: selectedElementRef.current }
              : {}),
          },
        })) as NonNullable<HttpChatTransportInitOptions<UIMessage>['prepareSendMessagesRequest']>,
      }),
    [serverUrl, sessionId],
  )

  const initialMessages = useMemo((): UIMessage[] => {
    const text = welcomeMessage?.trim()
    if (!text) return []
    return [
      {
        id: `welcome-${sessionId}`,
        role: 'assistant',
        parts: [{ type: 'text', text, state: 'done' }],
      },
    ]
  }, [sessionId, welcomeMessage])

  const { messages, sendMessage, addToolOutput, status, error } = useChat({
    id: sessionId,
    ...(initialMessages.length > 0 ? { messages: initialMessages } : {}),
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      const name = toolCall.toolName
      if (name === 'request_clarification') return
      if (name === 'replace_form' || name === 'repair_form') return

      const executor = onExecuteToolRef.current
      if (!executor) {
        // Do not await addToolOutput — it uses the same SerialJobExecutor as the UI stream
        // and would deadlock with the in-flight stream job (chat stays "streaming", input disabled).
        void addToolOutput({
          toolCallId: toolCall.toolCallId,
          tool: name,
          output: { success: false, error: `No executor registered for tool ${name}` },
        } as Parameters<typeof addToolOutput>[0])
        return
      }

      try {
        const result = await executor(name, toolCall.input as Record<string, unknown>)
        void addToolOutput({
          toolCallId: toolCall.toolCallId,
          tool: name,
          output: result,
        } as Parameters<typeof addToolOutput>[0])
      } catch (err) {
        void addToolOutput({
          toolCallId: toolCall.toolCallId,
          tool: name,
          output: { success: false, error: String(err) },
        } as Parameters<typeof addToolOutput>[0])
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
  const formReplacePart = lastAssistantMessage
    ? findPendingFormReplacePart(lastAssistantMessage.parts)
    : undefined

  const clarificationPart = formReplacePart
    ? undefined
    : (lastAssistantMessage?.parts.find((p) => {
        if (p.type !== 'tool-request_clarification') return false
        return 'state' in p && p.state === 'input-available'
      }) as
    | {
        toolCallId: string
        input: { question: string; options?: string[]; context?: string }
      }
    | undefined)

  const pendingFormReplacement: FormReplacementPayload | null = formReplacePart
    ? {
        toolName: formReplacePart.toolName,
        jsonSchema: formReplacePart.input.jsonSchema,
        uiSchema: formReplacePart.input.uiSchema,
      }
    : null

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

  const formReplaceMetaRef = useRef(formReplacePart)
  useEffect(() => {
    formReplaceMetaRef.current = formReplacePart
  }, [formReplacePart])

  const confirmFormReplacement = useCallback(
    (confirmed: boolean) => {
      const meta = formReplaceMetaRef.current
      if (!meta) return

      if (!confirmed) {
        void addToolOutput({
          toolCallId: meta.toolCallId,
          tool: meta.toolName,
          output: { success: false, confirmed: false, message: 'User declined' },
        } as Parameters<typeof addToolOutput>[0])
        return
      }

      const executor = onExecuteToolRef.current
      if (!executor) {
        void addToolOutput({
          toolCallId: meta.toolCallId,
          tool: meta.toolName,
          output: { success: false, error: `No executor registered for tool ${meta.toolName}` },
        } as Parameters<typeof addToolOutput>[0])
        return
      }

      void (async () => {
        try {
          const args: Record<string, unknown> = {
            jsonSchema: meta.input.jsonSchema,
            uiSchema: meta.input.uiSchema,
          }
          const result = await executor(meta.toolName, args)
          void addToolOutput({
            toolCallId: meta.toolCallId,
            tool: meta.toolName,
            output: result,
          } as Parameters<typeof addToolOutput>[0])
        } catch (err) {
          void addToolOutput({
            toolCallId: meta.toolCallId,
            tool: meta.toolName,
            output: { success: false, error: String(err) },
          } as Parameters<typeof addToolOutput>[0])
        }
      })()
    },
    [addToolOutput],
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
  // Only the typing cursor (▋) while bytes are arriving — not during `submitted`,
  // which also covers waiting for the HTTP response to start and between
  // auto tool-result follow-up requests. Otherwise the UI looks "stuck streaming"
  // after the model finished (finish chunk) until the next round begins.
  const streamingMessageId =
    status === 'streaming' && lastMessage?.role === 'assistant' ? lastMessage.id : undefined

  return {
    messages: chatMessages,
    sendMessage: sendMessageText,
    isStreaming: isBusy,
    streamingMessageId,
    pendingClarification,
    answerClarification: answerClarificationWithId,
    pendingFormReplacement,
    confirmFormReplacement,
    agentStatus: agentStatus as 'idle' | 'thinking' | 'streaming' | 'error',
  }
}
