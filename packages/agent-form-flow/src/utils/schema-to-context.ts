/**
 * Utilities for preparing schema context before sending to the server.
 *
 * In Graviola, when editing a sub-entity (e.g. a Tag), the framework promotes
 * the relevant $defs entry to root level as if it were the root schema.
 * This module provides helpers for that transformation.
 */

/**
 * Promote a $defs entry to root level for editing as a standalone entity.
 *
 * Given a schema with $defs.Tag = { type: "object", properties: { name, color } },
 * calling promoteDefToRoot(schema, "Tag") returns:
 * { type: "object", properties: { name, color }, $defs: { ...originalDefs } }
 */
export function promoteDefToRoot(
  schema: Record<string, unknown>,
  defName: string,
): Record<string, unknown> {
  const defs = (schema['$defs'] ?? schema['definitions'] ?? {}) as Record<
    string,
    Record<string, unknown>
  >

  const targetDef = defs[defName]
  if (!targetDef) {
    throw new Error(`Definition "${defName}" not found in schema $defs/definitions`)
  }

  // Promote the def to root, keeping $defs for potential nested references
  return {
    ...targetDef,
    $defs: defs,
  }
}

/**
 * Extract x-graviola-* metadata from a JSON Schema into a flat object.
 */
export function extractGraviolaMetadata(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(schema)) {
    if (key.startsWith('x-graviola-')) {
      metadata[key] = value
    }
  }

  // Also extract from properties
  const properties = (schema['properties'] ?? {}) as Record<string, Record<string, unknown>>
  for (const [propName, propSchema] of Object.entries(properties)) {
    for (const [key, value] of Object.entries(propSchema)) {
      if (key.startsWith('x-graviola-')) {
        if (!metadata['fieldMetadata']) metadata['fieldMetadata'] = {}
        ;(metadata['fieldMetadata'] as Record<string, Record<string, unknown>>)[propName] = {
          ...((metadata['fieldMetadata'] as Record<string, Record<string, unknown>>)[propName] ?? {}),
          [key]: value,
        }
      }
    }
  }

  return metadata
}

/**
 * List all available entity types from $defs/definitions.
 */
export function listAvailableEntityTypes(
  schema: Record<string, unknown>,
): Array<{ name: string; title?: string | undefined }> {
  const defs = (schema['$defs'] ?? schema['definitions'] ?? {}) as Record<
    string,
    Record<string, unknown>
  >

  return Object.entries(defs).map(([name, defSchema]) => ({
    name,
    title: defSchema['title'] as string | undefined,
  }))
}
