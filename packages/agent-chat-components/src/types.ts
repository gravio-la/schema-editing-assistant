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

export interface AgentStatus {
  state: 'idle' | 'thinking' | 'streaming' | 'error'
}
