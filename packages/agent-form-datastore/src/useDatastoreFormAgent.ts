import { useMemo, useRef, useEffect } from 'react'
import { useFormFillingAgent } from '@graviola/agent-form-flow'
import type { UseFormFillingAgentReturn } from '@graviola/agent-form-flow'
import { createDatastoreCallbacks } from './create-datastore-callbacks'
import type { DatastoreLike, EntityTypeConfig } from './types'

export interface UseDatastoreFormAgentOptions {
  /** URL of the graviola-ai-rest-server. */
  serverUrl: string
  /** Session ID (create via useFormAgentSession or /api/session). */
  sessionId: string
  /** The Graviola AbstractDatastore instance (from useDataStore()). */
  dataStore: DatastoreLike
  /** JSON Schema for the current entity. */
  jsonSchema: Record<string, unknown>
  /** Optional UI Schema. */
  uiSchema?: Record<string, unknown> | undefined
  /** Current form data. */
  formData: Record<string, unknown>
  /** Entity type name (e.g. "Task"). */
  entityType?: string | undefined
  /** Set a single field value. */
  onSetFieldValue: (path: string, value: unknown) => void | Promise<void>
  /** Set multiple field values. */
  onSetMultipleFields?: ((fields: Array<{ path: string; value: unknown }>) => void | Promise<void>) | undefined
  /** Select a reference by ID (default: calls onSetFieldValue). */
  onSelectReference?: ((path: string, referenceId: string, referenceLabel: string) => void | Promise<void>) | undefined
  /** Per-entity-type configuration. */
  entityTypes?: Record<string, EntityTypeConfig> | undefined
  /** Confirmation handler before entity creation. Return true to proceed. */
  onConfirmCreate?: ((entityType: string, data: Record<string, unknown>) => Promise<boolean>) | undefined
  /** Default query limit. */
  defaultQueryLimit?: number | undefined
  /** Default search limit. */
  defaultSearchLimit?: number | undefined
  /** Optional metadata/hints for the assistant. */
  metadata?: Record<string, unknown> | undefined
  /** Error callback. */
  onError?: ((error: Error) => void) | undefined
}

/**
 * All-in-one hook that binds the form-filling assistant to a Graviola
 * AbstractDatastore. Combines useFormFillingAgent with automatically
 * generated datastore callbacks.
 *
 * This is the primary integration point for Graviola apps:
 *
 * @example
 * ```tsx
 * function TaskForm({ schema, formData, setFormData }) {
 *   const { dataStore } = useDataStore()  // from @graviola/state-hooks
 *   const { sessionId } = useFormAgentSession({ serverUrl })
 *
 *   const agent = useDatastoreFormAgent({
 *     serverUrl: "http://localhost:3002",
 *     sessionId,
 *     dataStore,
 *     jsonSchema: schema,
 *     formData,
 *     entityType: "Task",
 *     onSetFieldValue: (path, value) => setFormData({...formData, [path]: value}),
 *     onConfirmCreate: async (type, data) => {
 *       return window.confirm(`Create new ${type}?`)
 *     },
 *   })
 *
 *   return (
 *     <>
 *       <SemanticJsonForm schema={schema} data={formData} />
 *       <AgentFAB
 *         messages={agent.messages}
 *         onSend={agent.sendMessage}
 *         isStreaming={agent.isStreaming}
 *       />
 *     </>
 *   )
 * }
 * ```
 */
export function useDatastoreFormAgent({
  serverUrl,
  sessionId,
  dataStore,
  jsonSchema,
  uiSchema,
  formData,
  entityType,
  onSetFieldValue,
  onSetMultipleFields,
  onSelectReference,
  entityTypes,
  onConfirmCreate,
  defaultQueryLimit,
  defaultSearchLimit,
  metadata,
  onError,
}: UseDatastoreFormAgentOptions): UseFormFillingAgentReturn {
  // Keep refs to avoid recreating callbacks on every render
  const dataStoreRef = useRef(dataStore)
  useEffect(() => { dataStoreRef.current = dataStore }, [dataStore])

  const onConfirmCreateRef = useRef(onConfirmCreate)
  useEffect(() => { onConfirmCreateRef.current = onConfirmCreate }, [onConfirmCreate])

  // Create datastore-bound callbacks, memoized on schema and config changes
  const datastoreCallbacks = useMemo(
    () =>
      createDatastoreCallbacks({
        dataStore: dataStoreRef.current,
        jsonSchema,
        entityTypes,
        defaultQueryLimit,
        defaultSearchLimit,
        onConfirmCreate: async (type, data) => {
          const handler = onConfirmCreateRef.current
          if (!handler) return true
          return handler(type, data)
        },
      }),
    // Intentionally depend on jsonSchema reference — consumers typically memoize this
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jsonSchema, entityTypes, defaultQueryLimit, defaultSearchLimit],
  )

  // Merge datastore callbacks with any consumer overrides
  return useFormFillingAgent({
    serverUrl,
    sessionId,
    jsonSchema,
    uiSchema,
    formData,
    entityType,
    onSetFieldValue,
    onSetMultipleFields,
    onSelectReference,
    // These come from the datastore binding:
    onQueryOptions: datastoreCallbacks.onQueryOptions,
    onSearchOptions: datastoreCallbacks.onSearchOptions,
    onCreateEntity: datastoreCallbacks.onCreateEntity,
    onValidateForm: datastoreCallbacks.onValidateForm,
    // Get form state returns current formData
    onGetFormState: () => formData,
    metadata,
    onError,
  })
}
