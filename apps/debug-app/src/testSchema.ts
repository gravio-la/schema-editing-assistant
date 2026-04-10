/**
 * Initial empty schema matching server default (POST /api/session).
 */
export const emptyJsonSchema = (): Record<string, unknown> => ({
  type: 'object',
  properties: {},
  required: [] as string[],
})

export const emptyUiSchema = (): Record<string, unknown> => ({
  type: 'VerticalLayout',
  elements: [] as Record<string, unknown>[],
})

export function createEmptySchemaState(): {
  jsonSchema: Record<string, unknown>
  uiSchema: Record<string, unknown>
} {
  return {
    jsonSchema: emptyJsonSchema(),
    uiSchema: emptyUiSchema(),
  }
}
