import { streamText, tool } from 'ai'
import { z } from 'zod'
import { getModel } from '../config'
import { buildSystemPrompt } from './system-prompt'
import { executeToolCall } from './tool-executor'
import { saveSession } from '../session/store'
import logger from '../logger'
import type { Session } from '../session/types'

/** Run the agent for a single user turn and return a streaming Response. */
export async function runAgentStream(session: Session, userMessage: string): Promise<Response> {
  let currentSession: Session = {
    ...session,
    messages: [
      ...session.messages,
      { role: 'user', content: userMessage, createdAt: new Date().toISOString() },
    ],
    updatedAt: new Date().toISOString(),
  }

  let clarificationFired = false

  // Per-request tool executor — closes over currentSession so every execute
  // call reads and writes the latest session state.
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
    }

    await saveSession(currentSession)
    return { message: result.message }
  }

  // Tools defined inline so execute closures share currentSession.
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
      description: 'Replace the schema definition of an existing property. Path is dot-notation to the property itself.',
      parameters: z.object({
        path: z.string().describe('Dot-notation path to the property (e.g. "address.street").'),
        schema: z.record(z.string(), z.unknown()),
        required: z.boolean().optional(),
        uiSchemaOptions: z.record(z.string(), z.unknown()).optional(),
      }),
      execute: async (args) => exec('update_property', args as Record<string, unknown>),
    }),

    remove_property: tool({
      description: 'Remove a property from JSON Schema. Also removes it from required array and uiSchema.',
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
        options: z.array(z.string()).optional(),
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

  return result.toDataStreamResponse({
    getErrorMessage: (err) => {
      logger.error('stream error', { err: String(err), stack: err instanceof Error ? err.stack : undefined })
      return String(err)
    },
  })
}
