import { z } from 'zod'

export const JSONSchemaSchema = z.record(z.string(), z.unknown())
export const UISchemaSchema = z.record(z.string(), z.unknown())

export const AddPropertyOperationSchema = z.object({
  type: z.literal('add_property'),
  path: z.string(),
  name: z.string(),
  schema: z.record(z.string(), z.unknown()),
  required: z.boolean().optional(),
  uiSchemaOptions: z.record(z.string(), z.unknown()).optional(),
})

export const UpdatePropertyOperationSchema = z.object({
  type: z.literal('update_property'),
  path: z.string(),
  schema: z.record(z.string(), z.unknown()),
  required: z.boolean().optional(),
  uiSchemaOptions: z.record(z.string(), z.unknown()).optional(),
})

export const RemovePropertyOperationSchema = z.object({
  type: z.literal('remove_property'),
  path: z.string(),
})

export const ReplaceSubtreeOperationSchema = z.object({
  type: z.literal('replace_subtree'),
  path: z.string(),
  schema: z.record(z.string(), z.unknown()),
  uiSchema: z.record(z.string(), z.unknown()).optional(),
})

export const EditOperationSchema = z.discriminatedUnion('type', [
  AddPropertyOperationSchema,
  UpdatePropertyOperationSchema,
  RemovePropertyOperationSchema,
  ReplaceSubtreeOperationSchema,
])

export type JSONSchema = z.infer<typeof JSONSchemaSchema>
export type UISchema = z.infer<typeof UISchemaSchema>
export type AddPropertyOperation = z.infer<typeof AddPropertyOperationSchema>
export type UpdatePropertyOperation = z.infer<typeof UpdatePropertyOperationSchema>
export type RemovePropertyOperation = z.infer<typeof RemovePropertyOperationSchema>
export type ReplaceSubtreeOperation = z.infer<typeof ReplaceSubtreeOperationSchema>
export type EditOperation = z.infer<typeof EditOperationSchema>
