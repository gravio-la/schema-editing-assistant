/**
 * Payload for POST /api/session `customRenderers` — mirrors the agent server session API
 * (e.g. vercel-schema-agent-server CustomRendererSchema).
 */
export interface AgentSessionCustomRenderer {
  name: string
  description: string
  jsonSchema: Record<string, unknown>
  uiOptions?: Record<string, unknown>
  uiOptionsSchema?: Record<string, unknown>
}
