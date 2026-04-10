import { streamText, convertToModelMessages } from 'ai'
import type { ToolSet } from 'ai'
import { getModel } from '../config'
import { buildFormFillingPrompt, formFillingTools } from '@graviola/agent-form-tools'
import { saveSession } from '../session/store'
import logger from '../logger'
import type { Session } from '../session/types'
import { normalizeClientMessages } from './normalize-client-messages'

/**
 * Run the form-filling agent for a single user turn and return a streaming Response.
 *
 * All tools have no server-side execute handler — they are forwarded to the
 * client via the UI message stream and executed there (Mode A: frontend-provided schema).
 *
 * The full message array from the request body is used (not Redis session messages)
 * so that tool-call / tool-result history is preserved across multi-step continuations.
 */
export async function runFormFillingStream(
  session: Session,
  clientMessages: Array<{ role: string; content?: unknown; parts?: unknown }>,
  schema: { jsonSchema: Record<string, unknown>; uiSchema?: Record<string, unknown> } | undefined,
  formData: Record<string, unknown> | undefined,
  entityType?: string,
  metadata?: Record<string, unknown>,
): Promise<Response> {
  if (!schema) {
    throw new Error('Schema is required (Mode A: frontend-provided schema)')
  }

  const liveFormData = formData ?? session.formData ?? {}

  logger.info('runFormFillingStream', {
    sessionId: session.id,
    clientMessageCount: clientMessages.length,
    entityType: entityType ?? session.entityType,
    fieldCount: Object.keys((schema.jsonSchema as any)?.properties ?? {}).length,
    filledFieldCount: Object.keys(liveFormData).filter((k) => liveFormData[k] !== undefined && liveFormData[k] !== null).length,
  })

  const systemPrompt = buildFormFillingPrompt(schema.jsonSchema, {
    formData: liveFormData,
    language: session.language,
    uiSchema: schema.uiSchema,
    metadata: {
      ...metadata,
      ...(entityType !== undefined ? { entityType } : {}),
    },
  })

  const uiMessages = normalizeClientMessages(
    clientMessages as Array<{ role: string; content?: unknown; parts?: unknown }>,
  )
  const coreMessages = await convertToModelMessages(uiMessages, {
    tools: formFillingTools as unknown as ToolSet,
  })

  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    messages: coreMessages,
    tools: formFillingTools as unknown as ToolSet,
    onFinish: async (event) => {
      const { text, totalUsage, steps } = event
      const hasText = Boolean(text?.trim())
      const hasToolCalls = (steps ?? []).some((s) => (s.toolCalls?.length ?? 0) > 0)
      logger.info('stream finished', {
        sessionId: session.id,
        inputTokens: totalUsage?.inputTokens,
        outputTokens: totalUsage?.outputTokens,
        stepCount: steps?.length,
        toolCallNames: steps?.flatMap((s) => s.toolCalls?.map((tc) => tc.toolName) ?? []),
      })
      if (!hasText && !hasToolCalls) return

      const updatedSession: Session = {
        ...session,
        messages: [
          ...session.messages,
          {
            role: 'user',
            content:
              typeof clientMessages[clientMessages.length - 1]?.content === 'string'
                ? (clientMessages[clientMessages.length - 1]?.content as string)
                : '',
            createdAt: new Date().toISOString(),
          },
          { role: 'assistant', content: text ?? '', createdAt: new Date().toISOString() },
        ],
        formData: liveFormData,
        updatedAt: new Date().toISOString(),
      }
      await saveSession(updatedSession)
    },
  })

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      logger.error('stream error', {
        err: String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      if (error instanceof Error) return error.message
      return String(error)
    },
  })
}
