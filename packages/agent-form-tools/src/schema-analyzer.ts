import type {
  FieldClassification,
  FieldKind,
  OptionCardinality,
  SchemaAnalysis,
} from './types'

const HANDFUL_THRESHOLD = 20

/**
 * Analyze a JSON Schema to classify all fields for form-filling.
 * Extracts field types, references, enums, $defs, and metadata.
 */
export function analyzeSchema(
  jsonSchema: Record<string, unknown>,
  entityType?: string,
): SchemaAnalysis {
  const fields: FieldClassification[] = []
  const requiredFields: string[] = []
  const rootRequired = asStringArray(jsonSchema['required'])

  // Extract $defs / definitions
  const defs = (jsonSchema['$defs'] ?? jsonSchema['definitions'] ?? {}) as Record<
    string,
    Record<string, unknown>
  >
  const availableDefs = Object.entries(defs).map(([name, schema]) => ({
    name,
    title: schema['title'] as string | undefined,
    schema,
  }))

  // Walk top-level properties
  const properties = (jsonSchema['properties'] ?? {}) as Record<string, Record<string, unknown>>
  for (const [key, propSchema] of Object.entries(properties)) {
    const isRequired = rootRequired.includes(key)
    const field = classifyField(key, propSchema, isRequired, defs)
    fields.push(field)
    if (isRequired) requiredFields.push(key)
  }

  // Collect inlined enums and queryable references
  const inlinedEnums = fields
    .filter((f) => f.kind === 'enum' && f.enumValues && f.enumValues.length <= HANDFUL_THRESHOLD)
    .map((f) => ({ path: f.path, values: f.enumValues! }))

  const queryableReferences = fields
    .filter((f): f is FieldClassification & { referenceType: string; optionCardinality: OptionCardinality } =>
      f.kind === 'reference' && f.referenceType !== undefined && f.optionCardinality !== undefined)
    .map((f) => ({ path: f.path, referenceType: f.referenceType, cardinality: f.optionCardinality }))

  return {
    entityType: entityType ?? (jsonSchema['title'] as string) ?? 'Entity',
    fields,
    requiredFields,
    availableDefs,
    inlinedEnums,
    queryableReferences,
  }
}

function classifyField(
  path: string,
  schema: Record<string, unknown>,
  required: boolean,
  defs: Record<string, Record<string, unknown>>,
): FieldClassification {
  const type = schema['type'] as string | undefined
  const format = schema['format'] as string | undefined
  const title = schema['title'] as string | undefined
  const description = schema['description'] as string | undefined
  const defaultValue = schema['default']
  const examples = schema['examples'] as unknown[] | undefined
  const enumValues = schema['enum'] as unknown[] | undefined

  // Extract x-graviola-* metadata
  const metadata: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(schema)) {
    if (k.startsWith('x-graviola-')) {
      metadata[k] = v
    }
  }

  const canCreate = metadata['x-graviola-canCreate'] === true

  // Determine kind
  const kind = determineKind(schema, defs)
  const referenceType = extractReferenceType(schema, defs)
  const optionCardinality = determineCardinality(schema, metadata)

  return {
    path,
    type: type ?? 'unknown',
    kind,
    required,
    title,
    description,
    format,
    defaultValue,
    examples,
    enumValues,
    referenceType,
    optionCardinality: kind === 'reference' ? optionCardinality : undefined,
    canCreate: kind === 'reference' ? canCreate || referenceType !== undefined && defs[referenceType] !== undefined : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  }
}

function determineKind(
  schema: Record<string, unknown>,
  defs: Record<string, Record<string, unknown>>,
): FieldKind {
  // Has $ref → reference
  if (schema['$ref'] !== undefined) return 'reference'

  // oneOf with $ref entries → reference
  const oneOf = schema['oneOf'] as Array<Record<string, unknown>> | undefined
  if (oneOf?.some((entry) => entry['$ref'] !== undefined)) return 'reference'

  // Has enum → enum
  if (schema['enum'] !== undefined) return 'enum'

  const type = schema['type'] as string | undefined

  // Array
  if (type === 'array') {
    const items = schema['items'] as Record<string, unknown> | undefined
    if (items?.['$ref'] !== undefined) return 'reference'
    if (items?.['enum'] !== undefined) return 'enum'
    return 'array'
  }

  // Object
  if (type === 'object') return 'nested_object'

  // Simple types
  return 'simple'
}

function extractReferenceType(
  schema: Record<string, unknown>,
  _defs: Record<string, Record<string, unknown>>,
): string | undefined {
  // Direct $ref
  const ref = schema['$ref'] as string | undefined
  if (ref) return refToDefName(ref)

  // oneOf with $ref
  const oneOf = schema['oneOf'] as Array<Record<string, unknown>> | undefined
  const refEntry = oneOf?.find((entry) => entry['$ref'] !== undefined)
  if (refEntry) return refToDefName(refEntry['$ref'] as string)

  // Array of $ref
  if (schema['type'] === 'array') {
    const items = schema['items'] as Record<string, unknown> | undefined
    const itemRef = items?.['$ref'] as string | undefined
    if (itemRef) return refToDefName(itemRef)
  }

  // x-graviola-referenceType override
  const explicit = schema['x-graviola-referenceType'] as string | undefined
  if (explicit) return explicit

  return undefined
}

function refToDefName(ref: string): string {
  // "#/$defs/Category" → "Category"
  // "#/definitions/Category" → "Category"
  const parts = ref.split('/')
  return parts[parts.length - 1]!
}

function determineCardinality(
  schema: Record<string, unknown>,
  metadata: Record<string, unknown>,
): OptionCardinality {
  // Explicit metadata override
  if (metadata['x-graviola-optionCardinality'] === 'many') return 'many'
  if (metadata['x-graviola-optionCardinality'] === 'handful') return 'handful'

  // Enums with values → count them
  const enumValues = schema['enum'] as unknown[] | undefined
  if (enumValues) {
    return enumValues.length <= HANDFUL_THRESHOLD ? 'handful' : 'many'
  }

  // Default for references: assume many (safer — triggers search)
  return 'many'
}

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return []
  return val.filter((v): v is string => typeof v === 'string')
}
