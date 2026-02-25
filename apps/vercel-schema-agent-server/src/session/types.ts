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

export const SessionSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messages: z.array(MessageSchema),
  schemaState: SchemaStateSchema,
  language: z.enum(['de', 'en']).default('en'),
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
export type Session = z.infer<typeof SessionSchema>
