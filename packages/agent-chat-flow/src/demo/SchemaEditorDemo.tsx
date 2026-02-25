import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { AgentChatProvider } from '../components/AgentChatProvider'
import type { SchemaState } from '../hooks/useSchemaSync'

interface SchemaEditorDemoProps {
  serverUrl?: string
  sessionId?: string
  initialSchema?: Record<string, unknown>
  initialUiSchema?: Record<string, unknown>
}

export function SchemaEditorDemo({
  serverUrl = 'http://localhost:3001',
  sessionId = 'demo-session',
  initialSchema = { type: 'object', properties: {}, required: [] },
  initialUiSchema = {},
}: SchemaEditorDemoProps) {
  const [schemaState, setSchemaState] = useState<SchemaState>({
    jsonSchema: initialSchema,
    uiSchema: initialUiSchema,
    version: 0,
  })

  return (
    <Box sx={{ display: 'flex', height: '100vh', gap: 2, p: 2, bgcolor: 'grey.50' }}>
      <Paper sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          JSON Schema <Typography component="span" variant="caption" color="text.secondary">(v{schemaState.version})</Typography>
        </Typography>
        <Box component="pre" sx={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}>
          {JSON.stringify(schemaState.jsonSchema, null, 2)}
        </Box>
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          UI Schema
        </Typography>
        <Box component="pre" sx={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}>
          {JSON.stringify(schemaState.uiSchema, null, 2)}
        </Box>
      </Paper>
      <AgentChatProvider
        serverUrl={serverUrl}
        sessionId={sessionId}
        onSchemaUpdate={setSchemaState}
      >
        <Box />
      </AgentChatProvider>
    </Box>
  )
}
