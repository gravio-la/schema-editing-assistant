import { useEffect, useRef } from 'react'
import { debounce } from 'lodash-es'

export interface SchemaState {
  jsonSchema: Record<string, unknown>
  uiSchema: Record<string, unknown>
  version: number
}

interface UseSchemaSync {
  serverUrl: string
  sessionId: string
  schemaVersion: number
  onSchemaUpdate: (state: SchemaState) => void
  /**
   * Increment this token to force an immediate re-fetch regardless of the
   * cached schemaVersion. Useful after a streaming response completes.
   */
  refreshToken?: number
}

export function useSchemaSync({
  serverUrl,
  sessionId,
  schemaVersion,
  onSchemaUpdate,
  refreshToken = 0,
}: UseSchemaSync): void {
  const onSchemaUpdateRef = useRef(onSchemaUpdate)
  onSchemaUpdateRef.current = onSchemaUpdate

  useEffect(() => {
    const fetchSchema = debounce(async () => {
      try {
        const res = await fetch(`${serverUrl}/api/schema/${sessionId}`)
        if (res.ok) {
          const state = (await res.json()) as SchemaState
          onSchemaUpdateRef.current(state)
        }
      } catch {
        // silent fail on sync
      }
    }, 300)

    void fetchSchema()
    return () => {
      fetchSchema.cancel()
    }
    // refreshToken is intentionally included so incrementing it forces a re-fetch
    // even when the local schemaVersion hasn't caught up yet.
  }, [serverUrl, sessionId, schemaVersion, refreshToken])
}
