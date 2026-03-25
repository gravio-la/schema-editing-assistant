/** Classification of a JSON Schema field for form-filling purposes. */
export type FieldKind =
  | 'simple'
  | 'enum'
  | 'reference'
  | 'nested_object'
  | 'array'

/** How reference options should be resolved. */
export type OptionCardinality = 'handful' | 'many'

/** A single field analysis result. */
export interface FieldClassification {
  /** JSON pointer path (e.g. "title", "address.street") */
  path: string
  /** JSON Schema type */
  type: string
  /** Classification for form-filling */
  kind: FieldKind
  /** Whether the field is required */
  required: boolean
  /** Human-readable title from schema */
  title?: string | undefined
  /** Description from schema */
  description?: string | undefined
  /** Format hint (e.g. "date", "email", "uri") */
  format?: string | undefined
  /** Default value from schema */
  defaultValue?: unknown
  /** Examples from schema */
  examples?: unknown[] | undefined
  /** For enum fields: the allowed values */
  enumValues?: unknown[] | undefined
  /** For reference fields: the type of entity being referenced */
  referenceType?: string | undefined
  /** For reference fields: whether there are few or many options */
  optionCardinality?: OptionCardinality | undefined
  /** Whether new entities of this reference type can be created */
  canCreate?: boolean | undefined
  /** Custom x-graviola-* metadata */
  metadata?: Record<string, unknown> | undefined
}

/** Full schema analysis result. */
export interface SchemaAnalysis {
  /** The entity type name (from schema title or provided) */
  entityType: string
  /** All classified fields */
  fields: FieldClassification[]
  /** Required field paths */
  requiredFields: string[]
  /** $defs / definitions entries available for cascading creation */
  availableDefs: Array<{ name: string; title?: string | undefined; schema: Record<string, unknown> }>
  /** Enum fields with <=20 options (inlined in prompt) */
  inlinedEnums: Array<{ path: string; values: unknown[] }>
  /** Reference fields that need querying */
  queryableReferences: Array<{ path: string; referenceType: string; cardinality: OptionCardinality }>
}

/** Context passed to the system prompt builder. */
export interface FormFillingContext {
  /** Schema analysis output */
  analysis: SchemaAnalysis
  /** Current form data (values already filled) */
  formData: Record<string, unknown>
  /** Language for the assistant */
  language: 'de' | 'en'
  /** Optional UI Schema for layout/label hints */
  uiSchema?: Record<string, unknown> | undefined
  /** Optional extra metadata/hints */
  metadata?: Record<string, unknown> | undefined
}
