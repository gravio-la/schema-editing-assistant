import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { AgentChatProvider } from '../components/AgentChatProvider'
import type { ToolResult } from '../hooks/useSchemaAgent'

interface DemoState {
  jsonSchema: Record<string, unknown>
  uiSchema: Record<string, unknown>
}

interface SchemaEditorDemoProps {
  serverUrl?: string
  sessionId?: string
  initialSchema?: Record<string, unknown>
  initialUiSchema?: Record<string, unknown>
}

/** In-browser demo that applies tool calls as plain JS mutations on a local
 *  state object. For real use, this is replaced by Redux dispatch in the
 *  consumer app (AgentAssistant.tsx). */
export function SchemaEditorDemo({
  serverUrl = 'http://localhost:3001',
  sessionId = 'demo-session',
  initialSchema = { type: 'object', properties: {}, required: [] },
  initialUiSchema = { type: 'VerticalLayout', elements: [] },
}: SchemaEditorDemoProps) {
  const [state, setState] = useState<DemoState>({
    jsonSchema: initialSchema,
    uiSchema: initialUiSchema,
  })

  const handleExecuteTool = useCallback(
    (toolName: string, args: Record<string, unknown>): ToolResult => {
      // In the demo we just log — real app dispatches to Redux
      // eslint-disable-next-line no-console
      console.log('[SchemaEditorDemo] tool call', toolName, args)
      return { success: true, message: `Demo: ${toolName} received (no-op)` }
    },
    [],
  )

  return (
    <Box sx={{ display: 'flex', height: '100vh', gap: 2, p: 2, bgcolor: 'grey.50' }}>
      <Paper sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          JSON Schema
        </Typography>
        <Box component="pre" sx={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}>
          {JSON.stringify(state.jsonSchema, null, 2)}
        </Box>
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          UI Schema
        </Typography>
        <Box component="pre" sx={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}>
          {JSON.stringify(state.uiSchema, null, 2)}
        </Box>
      </Paper>
      <AgentChatProvider
        serverUrl={serverUrl}
        sessionId={sessionId}
        schema={state}
        onExecuteTool={handleExecuteTool}
      >
        <Box />
      </AgentChatProvider>
    </Box>
  )
}
