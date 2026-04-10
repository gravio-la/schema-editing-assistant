export const AGENT_CHAT_FLOW_VERSION = '0.1.5'
// eslint-disable-next-line no-console
console.info(`[agent-chat-flow] ${AGENT_CHAT_FLOW_VERSION} loaded`)

export { resolveChatApiUrl, resolveServerOrigin } from './utils/resolve-chat-api-url'
export { StreamTestDemo } from './demo/StreamTestDemo'
export { useSchemaAgent } from './hooks/useSchemaAgent'
export type { ToolResult } from './hooks/useSchemaAgent'
export { AgentChatProvider } from './components/AgentChatProvider'
export { AiAssistantProvider } from './components/AiAssistantProvider'
export type { AgentSessionCustomRenderer } from './types/agent-session'
export { AiAssistantContext } from './context/AiAssistantContext'
export { useAiAssistantChat } from './hooks/useAiAssistantChat'
export { SchemaEditorDemo } from './demo/SchemaEditorDemo'
export type { AiAssistantContextValue } from './hooks/useAiAssistantChat'
