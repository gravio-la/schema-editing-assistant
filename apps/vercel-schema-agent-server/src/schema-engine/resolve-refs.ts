import $RefParser from '@apidevtools/json-schema-ref-parser'

/** Dereference all $ref pointers in a JSON Schema. */
export async function resolveRefs(schema: unknown): Promise<unknown> {
  return $RefParser.dereference(schema as Parameters<typeof $RefParser.dereference>[0])
}
