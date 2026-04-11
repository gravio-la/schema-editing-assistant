export interface ChatMessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

export interface ClarificationPayload {
  question: string
  options?: string[]
  context?: string
}

/** Pending replace_form / repair_form — user must confirm before the app applies schemas. */
export interface FormReplacementPayload {
  toolName: 'replace_form' | 'repair_form'
  jsonSchema: Record<string, unknown>
  uiSchema: Record<string, unknown>
}

export interface AgentStatus {
  state: 'idle' | 'thinking' | 'streaming' | 'error'
}
