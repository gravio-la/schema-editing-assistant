import { z } from 'zod'

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool']),
  content: z.string(),
  id: z.string().uuid().optional(),
  createdAt: z.string().optional(),
})

export type Message = z.infer<typeof MessageSchema>

export const SessionSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(MessageSchema),
  formData: z.record(z.string(), z.unknown()).default({}),
  entityType: z.string().optional(),
  language: z.enum(['de', 'en']).default('en'),
  pendingClarification: z
    .object({
      question: z.string(),
      options: z.array(z.string()).optional(),
      context: z.string().optional(),
    })
    .optional(),
})

export type Session = z.infer<typeof SessionSchema>
