import { tool } from 'ai'
import { z } from 'zod'

/**
 * Vercel AI SDK tool definitions for the five schema-editing operations.
 * No `execute` handlers — all execution is routed through tool-executor.ts.
 */
export const tools = {
  add_property: tool({
    description:
      'Add a new property to the JSON Schema at the given parent path. Use "" as path for root-level properties.',
    parameters: z.object({
      path: z
        .string()
        .describe('Dot-notation path to the parent object. Use "" (empty string) for root.'),
      name: z.string().describe('The property key name to add.'),
      schema: z
        .record(z.string(), z.unknown())
        .describe('JSON Schema definition for the new property (e.g. { type: "string", title: "Name" }).'),
      required: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to add this field to the parent required array.'),
      uiSchemaOptions: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional JSON Forms UI schema options to set for this property (e.g. { "ui:widget": "autocomplete" }).'),
    }),
  }),

  update_property: tool({
    description:
      'Replace the schema definition of an existing property. Path is dot-notation to the property itself.',
    parameters: z.object({
      path: z
        .string()
        .describe('Dot-notation path to the property to update (e.g. "address.street").'),
      schema: z
        .record(z.string(), z.unknown())
        .describe('New JSON Schema definition to apply to this property.'),
      required: z
        .boolean()
        .optional()
        .describe('Set true to make required, false to make optional, omit to leave unchanged.'),
      uiSchemaOptions: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional JSON Forms UI schema options to update for this property.'),
    }),
  }),

  remove_property: tool({
    description:
      'Remove a property from the JSON Schema. Also removes it from the required array and uiSchema.',
    parameters: z.object({
      path: z
        .string()
        .describe('Dot-notation path to the property to remove (e.g. "address.street").'),
    }),
  }),

  replace_subtree: tool({
    description:
      'Replace an entire schema subtree. Use for major restructuring. Prefer targeted tools for single-property changes.',
    parameters: z.object({
      path: z
        .string()
        .describe('Dot-notation path to the subtree to replace. Use "" to replace the entire schema.'),
      schema: z
        .record(z.string(), z.unknown())
        .describe('New JSON Schema subtree to put at this path.'),
      uiSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional new uiSchema subtree to put at this path.'),
    }),
  }),

  request_clarification: tool({
    description:
      'Ask the user for clarification when intent is ambiguous. IMPORTANT: After calling this tool you MUST stop — do not call any other tool in this turn. The agent loop will pause until the user responds.',
    parameters: z.object({
      question: z
        .string()
        .describe('The clarifying question to present to the user.'),
      options: z
        .array(z.string())
        .optional()
        .describe('Optional list of answer choices to show as quick-reply chips.'),
      context: z
        .string()
        .optional()
        .describe('Optional context explaining why clarification is needed.'),
    }),
  }),
} as const
