import type { ClarificationPayload, ChatMessageData } from '@graviola/agent-chat-components'

export type { ClarificationPayload, ChatMessageData }

export interface ReferenceOption {
  id: string
  label: string
}

export interface ValidationResult {
  valid: boolean
  errors?: string[]
}

export interface CreatedEntity {
  id: string
  label: string
}

export interface ToolResult {
  success: boolean
  message?: string
  error?: string
  data?: unknown
}

export interface UseFormFillingAgentOptions {
  serverUrl: string
  sessionId: string
  /** JSON Schema for the current entity type. */
  jsonSchema: Record<string, unknown>
  /** Optional UI Schema for layout/label hints. */
  uiSchema?: Record<string, unknown> | undefined
  /** Current form data — sent with every request. */
  formData: Record<string, unknown>
  /** Entity type identifier (e.g. "Task", "Category"). */
  entityType?: string | undefined
  /** Set a single field value in the form. */
  onSetFieldValue: (path: string, value: unknown) => void | Promise<void>
  /** Set multiple field values at once. */
  onSetMultipleFields?: ((fields: Array<{ path: string; value: unknown }>) => void | Promise<void>) | undefined
  /** Query available options for a reference field (Mode A: client-side). */
  onQueryOptions?: ((referenceType: string, limit?: number) => Promise<ReferenceOption[]>) | undefined
  /** Fuzzy search for reference options (Mode A: client-side). */
  onSearchOptions?: ((referenceType: string, query: string, limit?: number) => Promise<ReferenceOption[]>) | undefined
  /** Select a reference option by ID. */
  onSelectReference?: ((path: string, referenceId: string, referenceLabel: string) => void | Promise<void>) | undefined
  /** Create a new entity (cascading creation). */
  onCreateEntity?: ((entityType: string, data: Record<string, unknown>) => Promise<CreatedEntity>) | undefined
  /** Validate the current form data. */
  onValidateForm?: (() => Promise<ValidationResult>) | undefined
  /** Get the current form data snapshot. */
  onGetFormState?: (() => Record<string, unknown>) | undefined
  /** Optional metadata/hints for the assistant. */
  metadata?: Record<string, unknown> | undefined
  /** Error callback. */
  onError?: ((error: Error) => void) | undefined
}

export interface UseFormFillingAgentReturn {
  messages: ChatMessageData[]
  sendMessage: (text: string) => void
  isStreaming: boolean
  streamingMessageId: string | undefined
  pendingClarification: ClarificationPayload | null
  answerClarification: (answer: string) => void
  agentStatus: 'idle' | 'thinking' | 'streaming' | 'error'
}
