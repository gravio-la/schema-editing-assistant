import type { ReferenceOption, CreatedEntity, ValidationResult } from '@graviola/agent-form-flow'

/**
 * Minimal subset of Graviola's AbstractDatastore that the form-filling
 * assistant needs. Consumers can pass the full AbstractDatastore — only
 * these methods will be used.
 *
 * This keeps the binding package decoupled from the full @graviola/core-types
 * dependency while remaining structurally compatible.
 */
export interface DatastoreLike {
  /**
   * Find documents by type and optional filter.
   * Used by query_reference_options.
   */
  findDocuments: (
    typeIRI: string,
    filter?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<Array<Record<string, unknown>>>

  /**
   * Find documents by label (fuzzy text search).
   * Used by search_reference_options.
   */
  findDocumentsByLabel: (
    label: string,
    options?: Record<string, unknown>,
  ) => Promise<Array<Record<string, unknown>>>

  /**
   * Load a single document by type and ID.
   */
  loadDocument: (
    typeIRI: string,
    id: string,
  ) => Promise<Record<string, unknown>>

  /**
   * Create or update a document.
   * Used by create_entity.
   */
  upsertDocument: (
    typeIRI: string,
    document: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>

  /**
   * Convert a type name (e.g. "Category") to a type IRI.
   * Required for all store operations.
   */
  typeNameToTypeIRI: (typeName: string) => string
}

/**
 * Configuration for how entities are identified and displayed.
 */
export interface EntityDisplayConfig {
  /** Property name used as the display label (default: "label" or "name" or "title") */
  labelField?: string | undefined
  /** Property name used as the unique ID (default: "@id" or "id") */
  idField?: string | undefined
}

/**
 * Per-entity-type overrides for display and behavior.
 */
export interface EntityTypeConfig {
  /** How to display entities of this type */
  display?: EntityDisplayConfig | undefined
  /** Whether new entities of this type can be created via the assistant */
  canCreate?: boolean | undefined
  /** Custom type IRI override (bypasses typeNameToTypeIRI) */
  typeIRI?: string | undefined
}

/**
 * Options for createDatastoreCallbacks.
 */
export interface DatastoreBindingOptions {
  /** The abstract data store to bind to. */
  dataStore: DatastoreLike
  /** The JSON Schema for the current entity (used for validation). */
  jsonSchema: Record<string, unknown>
  /** Per-entity-type configuration overrides. */
  entityTypes?: Record<string, EntityTypeConfig> | undefined
  /** Default limit for query_reference_options. */
  defaultQueryLimit?: number | undefined
  /** Default limit for search_reference_options. */
  defaultSearchLimit?: number | undefined
  /**
   * Callback invoked before an entity is created, allowing the consumer
   * to show a confirmation dialog. Return true to proceed, false to cancel.
   * If not provided, creation proceeds without confirmation.
   */
  onConfirmCreate?: ((entityType: string, data: Record<string, unknown>) => Promise<boolean>) | undefined
}

/**
 * The callback functions produced by createDatastoreCallbacks,
 * ready to be spread into useFormFillingAgent options.
 */
export interface DatastoreCallbacks {
  onQueryOptions: (referenceType: string, limit?: number) => Promise<ReferenceOption[]>
  onSearchOptions: (referenceType: string, query: string, limit?: number) => Promise<ReferenceOption[]>
  onCreateEntity: (entityType: string, data: Record<string, unknown>) => Promise<CreatedEntity>
  onValidateForm: () => Promise<ValidationResult>
}
