import { streamText, convertToCoreMessages } from 'ai'
import type { ToolSet } from 'ai'
import { getModel } from '../config'
import { buildFormFillingPrompt, formFillingTools } from '@graviola/agent-form-tools'
import { saveSession } from '../session/store'
import logger from '../logger'
import type { Session } from '../session/types'

/**
 * Run the form-filling agent for a single user turn and return a streaming Response.
 *
 * All tools have no server-side execute handler — they are forwarded to the
 * client via the data stream and executed there (Mode A: frontend-provided schema).
 *
 * The full message array from the request body is used (not Redis session messages)
 * so that tool-call / tool-result history is preserved across maxSteps continuations.
 */
export function runFormFillingStream(
  session: Session,
  clientMessages: Array<{ role: string; content: unknown }>,
  schema: { jsonSchema: Record<string, unknown>; uiSchema?: Record<string, unknown> } | undefined,
  formData: Record<string, unknown> | undefined,
  entityType?: string,
  metadata?: Record<string, unknown>,
): Response {
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

  const coreMessages = convertToCoreMessages(clientMessages as Parameters<typeof convertToCoreMessages>[0])

  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    messages: coreMessages,
    tools: formFillingTools as unknown as ToolSet,
    toolCallStreaming: true,
    onFinish: async ({ text, usage, steps }) => {
      logger.info('stream finished', {
        sessionId: session.id,
        inputTokens: usage?.promptTokens,
        outputTokens: usage?.completionTokens,
        stepCount: steps?.length,
        toolCallNames: steps?.flatMap((s) => s.toolCalls?.map((tc) => tc.toolName) ?? []),
      })
      if (text) {
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
            { role: 'assistant', content: text, createdAt: new Date().toISOString() },
          ],
          formData: liveFormData,
          updatedAt: new Date().toISOString(),
        }
        await saveSession(updatedSession)
      }
    },
  })

  return result.toDataStreamResponse({
    getErrorMessage: (error) => {
      logger.error('stream error', {
        err: String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      if (error instanceof Error) return error.message
      return String(error)
    },
  })
}
