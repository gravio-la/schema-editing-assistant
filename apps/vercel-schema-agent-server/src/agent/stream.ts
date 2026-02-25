import { streamText, tool, createDataStreamResponse } from 'ai'
import type { DataStreamWriter } from 'ai'
import { z } from 'zod'
import LlmJson from '@solvers-hub/llm-json'
import { getModel } from '../config'
import { buildSystemPrompt } from './system-prompt'
import { executeToolCall } from './tool-executor'
import { saveSession } from '../session/store'
import logger from '../logger'
import type { Session } from '../session/types'

const llmJson = LlmJson.getInstance({ attemptCorrection: true })

/** Run the agent for a single user turn and return a streaming Response. */
export function runAgentStream(session: Session, userMessage: string): Response {
  let currentSession: Session = {
    ...session,
    messages: [
      ...session.messages,
      { role: 'user', content: userMessage, createdAt: new Date().toISOString() },
    ],
    updatedAt: new Date().toISOString(),
  }

  let clarificationFired = false

  return createDataStreamResponse({
    execute: async (dataStream: DataStreamWriter) => {
      // Per-request tool executor — closes over currentSession and dataStream.
      const exec = async (toolName: string, args: Record<string, unknown>) => {
        if (clarificationFired) return { message: 'Waiting for user clarification.' }

        logger.info('tool call', { tool: toolName, args })
        const result = await executeToolCall(toolName, args, currentSession)

        if (!result.ok) {
          logger.warn('tool execution failed', { tool: toolName, error: result.error })
          return { error: result.error }
        }

        currentSession = result.updatedSession

        if (toolName === 'request_clarification') {
          clarificationFired = true
          // Emit a data event so useChat's `data` array receives the clarification.
          const clarificationData: Record<string, unknown> = {
            type: 'clarification',
            question: args['question'] as string,
          }
          if (args['options'] !== undefined) clarificationData['options'] = args['options']
          if (args['context'] !== undefined) clarificationData['context'] = args['context']
          dataStream.writeData(clarificationData as Parameters<typeof dataStream.writeData>[0])
        }

        await saveSession(currentSession)
        return { message: result.message }
      }

      const tools = {
        add_property: tool({
          description:
            'Add a new property to the JSON Schema at the given parent path. Use "" as path for root-level properties.',
          parameters: z.object({
            path: z.string().describe('Dot-notation path to parent. "" = root.'),
            name: z.string(),
            schema: z.record(z.string(), z.unknown()),
            required: z.boolean().optional().default(false),
            uiSchemaOptions: z.record(z.string(), z.unknown()).optional(),
          }),
          execute: async (args) => exec('add_property', args as Record<string, unknown>),
        }),

        update_property: tool({
          description:
            'Replace the schema definition of an existing property. Path is dot-notation to the property itself.',
          parameters: z.object({
            path: z.string().describe('Dot-notation path to the property (e.g. "address.street").'),
            schema: z.record(z.string(), z.unknown()),
            required: z.boolean().optional(),
            uiSchemaOptions: z.record(z.string(), z.unknown()).optional(),
          }),
          execute: async (args) => exec('update_property', args as Record<string, unknown>),
        }),

        remove_property: tool({
          description:
            'Remove a property from JSON Schema. Also removes it from required array and uiSchema.',
          parameters: z.object({
            path: z.string().describe('Dot-notation path to the property to remove.'),
          }),
          execute: async (args) => exec('remove_property', args as Record<string, unknown>),
        }),

        replace_subtree: tool({
          description: 'Replace an entire schema subtree. Use "" path to replace the whole schema.',
          parameters: z.object({
            path: z.string(),
            schema: z.record(z.string(), z.unknown()),
            uiSchema: z.record(z.string(), z.unknown()).optional(),
          }),
          execute: async (args) => exec('replace_subtree', args as Record<string, unknown>),
        }),

        request_clarification: tool({
          description:
            'Ask the user for clarification when intent is ambiguous. IMPORTANT: After calling this tool you MUST stop — do not call any other tool in this turn.',
          parameters: z.object({
            question: z.string(),
            // The LLM occasionally JSON-stringifies the array instead of passing
            // a real array. Use llm-json to extract and repair it before Zod validates.
            options: z
              .preprocess((v) => {
                if (typeof v !== 'string') return v
                const { json } = llmJson.extractAll(v)
                return json[0] ?? v
              }, z.array(z.string()))
              .optional(),
            context: z.string().optional(),
          }),
          execute: async (args) => exec('request_clarification', args as Record<string, unknown>),
        }),
      }

      const result = streamText({
        model: getModel(),
        system: buildSystemPrompt(
          currentSession.schemaState.jsonSchema,
          currentSession.schemaState.uiSchema,
          currentSession.language,
        ),
        messages: currentSession.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        tools,
        maxSteps: 8,
        onFinish: async ({ text, usage }) => {
          if (text) {
            currentSession = {
              ...currentSession,
              messages: [
                ...currentSession.messages,
                { role: 'assistant', content: text, createdAt: new Date().toISOString() },
              ],
              updatedAt: new Date().toISOString(),
            }
          }
          await saveSession(currentSession)
          logger.info('stream finished', {
            sessionId: currentSession.id,
            inputTokens: usage?.promptTokens,
            outputTokens: usage?.completionTokens,
            clarificationFired,
          })
        },
      })

      result.mergeIntoDataStream(dataStream)
    },

    onError: (err) => {
      logger.error('stream error', {
        err: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
      return String(err)
    },
  })
}
