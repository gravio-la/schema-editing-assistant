import type { Session } from '../session/types'
import { applyOperation } from '../schema-engine/patch'
import type { EditOperation } from '../schema-engine/types'
import logger from '../logger'

type ToolResult =
  | { ok: true; message: string; updatedSession: Session }
  | { ok: false; error: string; updatedSession: Session }

/** Route a tool call from the agent to the appropriate schema-engine operation. */
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  session: Session,
): Promise<ToolResult> {
  if (toolName === 'request_clarification') {
    const question = args['question'] as string
    const options = args['options'] as string[] | undefined
    const context = args['context'] as string | undefined
    const updatedSession: Session = {
      ...session,
      pendingClarification: { question, options, context },
      updatedAt: new Date().toISOString(),
    }
    return { ok: true, message: 'Clarification requested.', updatedSession }
  }

  const operation = buildOperation(toolName, args)
  if (!operation) {
    return { ok: false, error: `Unknown tool: ${toolName}`, updatedSession: session }
  }

  const result = applyOperation(session.schemaState, operation)

  if (!result.success) {
    logger.warn('patch failed', { toolName, error: result.error })
    return { ok: false, error: result.error, updatedSession: session }
  }

  const updatedSession: Session = {
    ...session,
    schemaState: {
      ...result.newState,
      version: session.schemaState.version + 1,
    },
    updatedAt: new Date().toISOString(),
  }

  return { ok: true, message: `Applied ${toolName} successfully.`, updatedSession }
}

function buildOperation(
  toolName: string,
  args: Record<string, unknown>,
): EditOperation | null {
  switch (toolName) {
    case 'add_property':
      return {
        type: 'add_property',
        path: args['path'] as string,
        name: args['name'] as string,
        schema: args['schema'] as Record<string, unknown>,
        required: args['required'] as boolean | undefined,
        uiSchemaOptions: args['uiSchemaOptions'] as Record<string, unknown> | undefined,
      }
    case 'update_property':
      return {
        type: 'update_property',
        path: args['path'] as string,
        schema: args['schema'] as Record<string, unknown>,
        required: args['required'] as boolean | undefined,
        uiSchemaOptions: args['uiSchemaOptions'] as Record<string, unknown> | undefined,
      }
    case 'remove_property':
      return {
        type: 'remove_property',
        path: args['path'] as string,
      }
    case 'replace_subtree':
      return {
        type: 'replace_subtree',
        path: args['path'] as string,
        schema: args['schema'] as Record<string, unknown>,
        uiSchema: args['uiSchema'] as Record<string, unknown> | undefined,
      }
    default:
      return null
  }
}
