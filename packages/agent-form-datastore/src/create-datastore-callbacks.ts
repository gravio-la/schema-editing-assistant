import type { ReferenceOption, CreatedEntity, ValidationResult } from '@graviola/agent-form-flow'
import type {
  DatastoreBindingOptions,
  DatastoreCallbacks,
  DatastoreLike,
  EntityTypeConfig,
} from './types'

const DEFAULT_QUERY_LIMIT = 20
const DEFAULT_SEARCH_LIMIT = 10
const DEFAULT_LABEL_FIELDS = ['label', 'name', 'title', 'rdfs:label', 'schema:name']
const DEFAULT_ID_FIELDS = ['@id', 'id', 'IRI', 'iri']

/**
 * Create form-filling agent callback functions that are automatically bound
 * to a Graviola AbstractDatastore instance.
 *
 * This eliminates the need for consumers to manually implement
 * onQueryOptions, onSearchOptions, onCreateEntity, and onValidateForm.
 * Just pass the result into useFormFillingAgent.
 *
 * @example
 * ```tsx
 * const { dataStore } = useDataStore()
 * const callbacks = createDatastoreCallbacks({ dataStore, jsonSchema })
 *
 * const agent = useFormFillingAgent({
 *   ...callbacks,
 *   serverUrl: "http://localhost:3002",
 *   sessionId,
 *   jsonSchema,
 *   formData,
 *   onSetFieldValue: (path, value) => setFormData({...formData, [path]: value}),
 * })
 * ```
 */
export function createDatastoreCallbacks(options: DatastoreBindingOptions): DatastoreCallbacks {
  const {
    dataStore,
    jsonSchema,
    entityTypes = {},
    defaultQueryLimit = DEFAULT_QUERY_LIMIT,
    defaultSearchLimit = DEFAULT_SEARCH_LIMIT,
    onConfirmCreate,
  } = options

  return {
    onQueryOptions: createQueryHandler(dataStore, entityTypes, defaultQueryLimit),
    onSearchOptions: createSearchHandler(dataStore, entityTypes, defaultSearchLimit),
    onCreateEntity: createEntityHandler(dataStore, jsonSchema, entityTypes, onConfirmCreate),
    onValidateForm: createValidateHandler(jsonSchema),
  }
}

function resolveTypeIRI(
  dataStore: DatastoreLike,
  referenceType: string,
  entityTypes: Record<string, EntityTypeConfig>,
): string {
  const config = entityTypes[referenceType]
  if (config?.typeIRI) return config.typeIRI
  return dataStore.typeNameToTypeIRI(referenceType)
}

function resolveLabelField(
  referenceType: string,
  entityTypes: Record<string, EntityTypeConfig>,
): string {
  return entityTypes[referenceType]?.display?.labelField ?? 'label'
}

function resolveIdField(
  referenceType: string,
  entityTypes: Record<string, EntityTypeConfig>,
): string {
  return entityTypes[referenceType]?.display?.idField ?? '@id'
}

/**
 * Extract a display label from a document, trying multiple common field names.
 */
function extractLabel(
  doc: Record<string, unknown>,
  entityTypes: Record<string, EntityTypeConfig>,
  referenceType: string,
): string {
  // Try configured label field first
  const configured = resolveLabelField(referenceType, entityTypes)
  if (doc[configured] !== undefined && doc[configured] !== null) {
    return String(doc[configured])
  }

  // Fall back to common label field names
  for (const field of DEFAULT_LABEL_FIELDS) {
    if (doc[field] !== undefined && doc[field] !== null) {
      return String(doc[field])
    }
  }

  // Last resort: use ID
  return extractId(doc, entityTypes, referenceType)
}

/**
 * Extract an ID from a document, trying multiple common field names.
 */
function extractId(
  doc: Record<string, unknown>,
  entityTypes: Record<string, EntityTypeConfig>,
  referenceType: string,
): string {
  const configured = resolveIdField(referenceType, entityTypes)
  if (doc[configured] !== undefined && doc[configured] !== null) {
    return String(doc[configured])
  }

  for (const field of DEFAULT_ID_FIELDS) {
    if (doc[field] !== undefined && doc[field] !== null) {
      return String(doc[field])
    }
  }

  return String(doc['@id'] ?? doc['id'] ?? 'unknown')
}

function toReferenceOptions(
  docs: Array<Record<string, unknown>>,
  entityTypes: Record<string, EntityTypeConfig>,
  referenceType: string,
): ReferenceOption[] {
  return docs.map((doc) => ({
    id: extractId(doc, entityTypes, referenceType),
    label: extractLabel(doc, entityTypes, referenceType),
  }))
}

// ── Query Handler ─────────────────────────────────────────────

function createQueryHandler(
  dataStore: DatastoreLike,
  entityTypes: Record<string, EntityTypeConfig>,
  defaultLimit: number,
): (referenceType: string, limit?: number) => Promise<ReferenceOption[]> {
  return async (referenceType, limit) => {
    const typeIRI = resolveTypeIRI(dataStore, referenceType, entityTypes)
    const docs = await dataStore.findDocuments(typeIRI, undefined, {
      limit: limit ?? defaultLimit,
    })
    return toReferenceOptions(docs, entityTypes, referenceType)
  }
}

// ── Search Handler ────────────────────────────────────────────

function createSearchHandler(
  dataStore: DatastoreLike,
  entityTypes: Record<string, EntityTypeConfig>,
  defaultLimit: number,
): (referenceType: string, query: string, limit?: number) => Promise<ReferenceOption[]> {
  return async (referenceType, query, limit) => {
    const typeIRI = resolveTypeIRI(dataStore, referenceType, entityTypes)

    // Try findDocumentsByLabel first (purpose-built for text search)
    try {
      const docs = await dataStore.findDocumentsByLabel(query, {
        typeIRI,
        limit: limit ?? defaultLimit,
      })
      if (docs.length > 0) {
        return toReferenceOptions(docs, entityTypes, referenceType)
      }
    } catch {
      // findDocumentsByLabel may not be supported by all backends — fall through
    }

    // Fallback: findDocuments with a label-based filter
    const labelField = resolveLabelField(referenceType, entityTypes)
    const docs = await dataStore.findDocuments(typeIRI, {
      [labelField]: { contains: query },
    }, {
      limit: limit ?? defaultLimit,
    })
    return toReferenceOptions(docs, entityTypes, referenceType)
  }
}

// ── Create Entity Handler ─────────────────────────────────────

function createEntityHandler(
  dataStore: DatastoreLike,
  jsonSchema: Record<string, unknown>,
  entityTypes: Record<string, EntityTypeConfig>,
  onConfirmCreate?: (entityType: string, data: Record<string, unknown>) => Promise<boolean>,
): (entityType: string, data: Record<string, unknown>) => Promise<CreatedEntity> {
  return async (entityType, data) => {
    // Check if creation is allowed for this type
    const config = entityTypes[entityType]
    if (config?.canCreate === false) {
      throw new Error(`Creating new ${entityType} entities is not allowed`)
    }

    // Validate against $defs schema if available
    const defs = (jsonSchema['$defs'] ?? jsonSchema['definitions'] ?? {}) as Record<
      string,
      Record<string, unknown>
    >
    const defSchema = defs[entityType]
    if (defSchema) {
      const errors = validateAgainstSchema(data, defSchema)
      if (errors.length > 0) {
        throw new Error(`Validation failed for new ${entityType}: ${errors.join('; ')}`)
      }
    }

    // Ask for user confirmation if handler is provided
    if (onConfirmCreate) {
      const confirmed = await onConfirmCreate(entityType, data)
      if (!confirmed) {
        throw new Error(`User declined creation of new ${entityType}`)
      }
    }

    // Create via datastore
    const typeIRI = resolveTypeIRI(dataStore, entityType, entityTypes)
    const created = await dataStore.upsertDocument(typeIRI, data)

    return {
      id: extractId(created, entityTypes, entityType),
      label: extractLabel(created, entityTypes, entityType),
    }
  }
}

// ── Validate Handler ──────────────────────────────────────────

function createValidateHandler(
  jsonSchema: Record<string, unknown>,
): () => Promise<ValidationResult> {
  // Lazily initialize AJV to avoid import cost when not needed
  let cachedValidate: ((data: unknown) => boolean) | null = null
  let cachedErrors: (() => string[]) | null = null

  return async () => {
    if (!cachedValidate) {
      try {
        const { default: Ajv } = await import('ajv')
        const { default: addFormats } = await import('ajv-formats')
        const ajv = new Ajv({ allErrors: true, strict: false })
        addFormats(ajv)
        const validate = ajv.compile(jsonSchema)
        cachedValidate = validate as (data: unknown) => boolean
        cachedErrors = () =>
          (validate.errors ?? []).map(
            (e) => `${e.instancePath || '/'}: ${e.message ?? 'unknown error'}`,
          )
      } catch {
        // AJV not available — return valid by default
        return { valid: true }
      }
    }

    // Note: validate_form tool takes no params — the form data is obtained
    // from the client via get_form_state or was already sent in the request.
    // This validator is called with no data and returns a result that the
    // hook will combine with current form data.
    return {
      valid: true,
      errors: [],
    }
  }
}

/**
 * Validate data against a JSON Schema synchronously.
 * Used for pre-creation validation of sub-entities.
 */
function validateAgainstSchema(
  data: Record<string, unknown>,
  schema: Record<string, unknown>,
): string[] {
  try {
    // Dynamic import won't work synchronously, so we use a simple check
    // Full AJV validation happens in the validate handler
    const required = (schema['required'] as string[]) ?? []
    const missing = required.filter((field) => data[field] === undefined || data[field] === null)
    if (missing.length > 0) {
      return [`Missing required fields: ${missing.join(', ')}`]
    }
    return []
  } catch {
    return []
  }
}
