import { useChat } from '@ai-sdk/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type HttpChatTransportInitOptions,
  type UIMessage,
} from 'ai'
import type { ClarificationPayload, ChatMessageData } from '@graviola/agent-chat-components'
import { resolveChatApiUrl } from '../utils/resolve-chat-api-url'

type SelectedUISchemaElement = any

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

  const { messages, sendMessage, addToolOutput, status, error } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      const name = toolCall.toolName
      if (name === 'request_clarification') return

      const executor = onExecuteToolRef.current
      if (!executor) {
        await addToolOutput({
          toolCallId: toolCall.toolCallId,
          tool: name,
          output: { success: false, error: `No executor registered for tool ${name}` },
        } as Parameters<typeof addToolOutput>[0])
        return
      }

      try {
        const result = await executor(name, toolCall.input as Record<string, unknown>)
        await addToolOutput({
          toolCallId: toolCall.toolCallId,
          tool: name,
          output: result,
        } as Parameters<typeof addToolOutput>[0])
      } catch (err) {
        await addToolOutput({
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
    agentStatus: agentStatus as 'idle' | 'thinking' | 'streaming' | 'error',
  }
}
