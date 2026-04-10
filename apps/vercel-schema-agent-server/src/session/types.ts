import { z } from 'zod'

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool']),
  content: z.string(),
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
})

export const SchemaStateSchema = z.object({
  jsonSchema: z.record(z.string(), z.unknown()),
  uiSchema: z.record(z.string(), z.unknown()),
  version: z.number().int(),
})

/** Additional JSON Forms renderers / widgets available in this deployment (session-scoped). */
export const CustomRendererSchema = z.object({
  name: z.string(),
  description: z.string(),
  jsonSchema: z.record(z.string(), z.unknown()),
  /** Optional example or default uiOptions for this renderer. */
  uiOptions: z.record(z.string(), z.unknown()).optional(),
  /** Optional JSON Schema describing every allowed key and value shape for `uiOptions` in add_field. */
  uiOptionsSchema: z.record(z.string(), z.unknown()).optional(),
})

export const SessionSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messages: z.array(MessageSchema),
  schemaState: SchemaStateSchema,
  language: z.enum(['de', 'en']).default('en'),
  customRenderers: z.array(CustomRendererSchema).optional(),
  pendingClarification: z
    .object({
      question: z.string(),
      options: z.array(z.string()).optional(),
      context: z.string().optional(),
    })
    .optional(),
})

export type Message = z.infer<typeof MessageSchema>
export type SchemaState = z.infer<typeof SchemaStateSchema>
export type CustomRenderer = z.infer<typeof CustomRendererSchema>
export type Session = z.infer<typeof SessionSchema>
