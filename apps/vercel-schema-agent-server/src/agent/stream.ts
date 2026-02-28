import { streamText, convertToCoreMessages } from 'ai'
import type { ToolSet } from 'ai'
import { getModel } from '../config'
import { buildSystemPrompt } from './system-prompt'
import { tools } from './tools'
import { saveSession } from '../session/store'
import logger from '../logger'
import type { Session } from '../session/types'

type SelectedElement = any

/** Run the agent for a single user turn and return a streaming Response.
 *
 * All schema-editing tools have no server-side execute handler — they are
 * forwarded to the client via the data stream and executed there as Redux
 * dispatches. The request body must include the current schema snapshot so
 * the system prompt reflects the user's live Redux state.
 *
 * IMPORTANT: We use the full message array from the request body (not Redis
 * session messages) so that tool-call / tool-result history is preserved
 * across maxSteps continuations. Without this, each step looks like a new
 * blank conversation and the LLM repeats the same tool call indefinitely.
 *
 * request_clarification has no execute handler either; the Vercel AI SDK
 * forwards it to the client as a tool-invocation part, where the user answers
 * via addToolResult() and the loop continues.
 */
export function runAgentStream(
  session: Session,
  /** Full message array from the useChat request body.
   *  Includes user, assistant, tool-call and tool-result messages for the
   *  current turn — exactly what the LLM needs to continue the multi-step loop. */
  clientMessages: Array<{ role: string; content: unknown }>,
  schema: { jsonSchema: Record<string, unknown>; uiSchema: Record<string, unknown> } | undefined,
  selectedElement?: SelectedElement,
): Response {
  const liveSchema = schema ?? session.schemaState

  logger.info('runAgentStream', {
    sessionId: session.id,
    clientMessageCount: clientMessages.length,
    clientMessageRoles: clientMessages.map((m) => m.role),
    schemaPropertyCount: Object.keys((liveSchema.jsonSchema as any)?.properties ?? {}).length,
    uiSchemaElementCount: ((liveSchema.uiSchema as any)?.elements ?? []).length,
  })

  // convertToCoreMessages handles the useChat message format (which can have
  // content as string | ContentPart[]) and produces the CoreMessage[] that
  // streamText expects, including tool-use and tool-result blocks.
  const coreMessages = convertToCoreMessages(clientMessages as Parameters<typeof convertToCoreMessages>[0])

  const result = streamText({
    model: getModel(),
    system: buildSystemPrompt(
      liveSchema.jsonSchema,
      liveSchema.uiSchema,
      session.language,
      selectedElement,
    ),
    messages: coreMessages,
    tools: tools as unknown as ToolSet,
    toolCallStreaming: true,
    onFinish: async ({ text, usage, steps }) => {
      logger.info('stream finished', {
        sessionId: session.id,
        inputTokens: usage?.promptTokens,
        outputTokens: usage?.completionTokens,
        stepCount: steps?.length,
        toolCallNames: steps?.flatMap((s) => s.toolCalls?.map((tc) => tc.toolName) ?? []),
      })
      // Persist last assistant text message to session for context on next user turn
      if (text) {
        const updatedSession: Session = {
          ...session,
          messages: [
            ...session.messages,
            { role: 'user', content: typeof clientMessages[clientMessages.length - 1]?.content === 'string'
              ? (clientMessages[clientMessages.length - 1]?.content as string)
              : '', createdAt: new Date().toISOString() },
            { role: 'assistant', content: text, createdAt: new Date().toISOString() },
          ],
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
