import { tool } from 'ai'
import { z } from 'zod'

/**
 * Tool definitions for AI-assisted form filling.
 *
 * All tools are executed client-side via useChat's onToolCall callback,
 * which dispatches to the consumer app's form state and data layer.
 * The only exception is request_clarification which renders as a native
 * tool-invocation part in the chat UI.
 */
export const formFillingTools = {
  set_field_value: tool({
    description:
      'Set the value of a single form field. Use for any field type: string, number, boolean, date, enum. ' +
      'The path uses dot-notation for nested fields (e.g. "address.street").',
    parameters: z.object({
      path: z
        .string()
        .describe('Dot-notation path to the field, e.g. "title", "address.street", "dueDate".'),
      value: z
        .unknown()
        .describe(
          'The value to set. Must match the field type: string for text, number for numeric, ' +
          'boolean for toggles, ISO date string for dates (e.g. "2026-04-01").',
        ),
    }),
  }),

  set_multiple_fields: tool({
    description:
      'Set multiple form field values in a single call. Use when you can confidently fill ' +
      'several fields at once (e.g. from a natural language description). ' +
      'Each field is set independently — if one fails, others still apply.',
    parameters: z.object({
      fields: z
        .array(
          z.object({
            path: z.string().describe('Dot-notation path to the field.'),
            value: z.unknown().describe('The value to set.'),
          }),
        )
        .describe('Array of field path/value pairs to set.'),
    }),
  }),

  query_reference_options: tool({
    description:
      'Query available options for a reference or linked-data field. Use this when the field ' +
      'references another entity type (e.g. categories, tags, people) and you need to see what ' +
      'options exist. For fields with few options (< 20), this returns all of them. ' +
      'For fields with many options, use search_reference_options instead.',
    parameters: z.object({
      path: z
        .string()
        .describe('Dot-notation path of the reference field, e.g. "category", "tags".'),
      referenceType: z
        .string()
        .describe('The entity type to query, e.g. "Category", "Tag", "Person".'),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of options to return. Default: 20.'),
    }),
  }),

  search_reference_options: tool({
    description:
      'Fuzzy search for options in a reference field. Use when the reference type has many ' +
      'options and you need to find a specific one by name or keyword. ' +
      'Always prefer this over query_reference_options when you already know what you are looking for.',
    parameters: z.object({
      path: z
        .string()
        .describe('Dot-notation path of the reference field.'),
      referenceType: z
        .string()
        .describe('The entity type to search, e.g. "Category", "Tag".'),
      query: z
        .string()
        .describe('Search query string, e.g. "outdoor", "painting".'),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of results to return. Default: 10.'),
    }),
  }),

  select_reference: tool({
    description:
      'Select a reference option by its ID for a form field. Call this after query_reference_options ' +
      'or search_reference_options to actually set the value. For array fields (e.g. tags), ' +
      'this adds to the existing array rather than replacing.',
    parameters: z.object({
      path: z
        .string()
        .describe('Dot-notation path of the reference field.'),
      referenceId: z
        .string()
        .describe('The ID of the selected option.'),
      referenceLabel: z
        .string()
        .describe('Human-readable label of the selected option (for confirmation messages).'),
    }),
  }),

  create_entity: tool({
    description:
      'Propose creating a new entity when the needed reference option does not exist. ' +
      'For example, creating a new tag or category. The user will be shown a preview and ' +
      'must confirm before the entity is actually created. ' +
      'After creation, use select_reference to link the new entity to the form field.',
    parameters: z.object({
      entityType: z
        .string()
        .describe('The type of entity to create, e.g. "Tag", "Category".'),
      data: z
        .record(z.string(), z.unknown())
        .describe('The data for the new entity, matching its schema.'),
      targetPath: z
        .string()
        .optional()
        .describe(
          'The form field path where this entity will be linked after creation. ' +
          'If provided, the entity will be automatically selected after confirmation.',
        ),
    }),
  }),

  validate_form: tool({
    description:
      'Validate the current form data against the JSON Schema. ' +
      'Call this after filling all fields to check for validation errors before submission. ' +
      'Returns validation results including any errors with field paths and messages.',
    parameters: z.object({}),
  }),

  get_form_state: tool({
    description:
      'Request the current form data snapshot from the client. ' +
      'Use this when you need to see what values are currently filled in the form ' +
      'before deciding what to fill or modify.',
    parameters: z.object({}),
  }),

  request_clarification: tool({
    description:
      'Ask the user for clarification when their intent is ambiguous. ' +
      'IMPORTANT: After calling this tool you MUST stop — do not call any other tool in this response.',
    parameters: z.object({
      question: z.string().describe('The clarifying question to ask the user.'),
      options: z
        .array(z.string())
        .optional()
        .describe('Optional list of predefined answer options to show as chips.'),
      context: z
        .string()
        .optional()
        .describe('Optional additional context or explanation for the user.'),
    }),
  }),
}
