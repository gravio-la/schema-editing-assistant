export const AGENT_CHAT_FLOW_VERSION = '0.1.1-client-tools'
// eslint-disable-next-line no-console
console.info(`[agent-chat-flow] ${AGENT_CHAT_FLOW_VERSION} loaded`)

export { StreamTestDemo } from './demo/StreamTestDemo'
export { useSchemaAgent } from './hooks/useSchemaAgent'
export type { ToolResult } from './hooks/useSchemaAgent'
export { AgentChatProvider } from './components/AgentChatProvider'
export { AiAssistantProvider } from './components/AiAssistantProvider'
export { AiAssistantContext } from './context/AiAssistantContext'
export { useAiAssistantChat } from './hooks/useAiAssistantChat'
export { SchemaEditorDemo } from './demo/SchemaEditorDemo'
export type { AiAssistantContextValue } from './hooks/useAiAssistantChat'
