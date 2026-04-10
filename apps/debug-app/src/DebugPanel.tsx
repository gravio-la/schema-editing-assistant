import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { ToolLogEntry } from './mockToolExecutor'

export interface DebugPanelProps {
  sessionId: string | undefined
  isCreating: boolean
  toolLog: ToolLogEntry[]
  jsonSchema: Record<string, unknown>
  uiSchema: Record<string, unknown>
}

export function DebugPanel({ sessionId, isCreating, toolLog, jsonSchema, uiSchema }: DebugPanelProps) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ p: 2, maxWidth: 'min(960px, 100%)', mx: 'auto', mt: 2 }}
      data-testid="debug-panel"
    >
      <Typography variant="h6" gutterBottom>
        Debug
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Session
        </Typography>
        {isCreating ? (
          <Chip size="small" label="Creating…" data-testid="debug-session-creating" />
        ) : sessionId ? (
          <Chip size="small" label={sessionId} data-testid="debug-session-id" sx={{ fontFamily: 'monospace' }} />
        ) : (
          <Chip size="small" label="none" data-testid="debug-session-none" />
        )}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          Agent activity: chat panel header (status dot)
        </Typography>
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        Tool log
      </Typography>
      <Table size="small" data-testid="tool-log">
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
            <TableCell>Tool</TableCell>
            <TableCell>Args</TableCell>
            <TableCell>Result</TableCell>
          </TableRow>
        </TableHead>
        <TableBody data-testid="tool-log-body">
          {toolLog.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography variant="body2" color="text.secondary">
                  No tool calls yet
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            toolLog.map((row) => (
              <TableRow key={row.id} data-testid={`tool-log-row-${row.id}`}>
                <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{row.at}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{row.toolName}</TableCell>
                <TableCell>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      maxWidth: 360,
                      overflow: 'auto',
                      fontSize: '0.7rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {JSON.stringify(row.args, null, 0)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box
                    component="pre"
                    sx={{ m: 0, maxWidth: 280, overflow: 'auto', fontSize: '0.7rem' }}
                    data-testid="tool-result"
                  >
                    {JSON.stringify(row.result)}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            jsonSchema (live)
          </Typography>
          <Box
            component="pre"
            data-testid="json-schema-preview"
            sx={{
              m: 0,
              p: 1,
              bgcolor: 'action.hover',
              borderRadius: 1,
              fontSize: '0.75rem',
              overflow: 'auto',
              maxHeight: 320,
            }}
          >
            {JSON.stringify(jsonSchema, null, 2)}
          </Box>
        </Box>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            uiSchema (live)
          </Typography>
          <Box
            component="pre"
            data-testid="ui-schema-preview"
            sx={{
              m: 0,
              p: 1,
              bgcolor: 'action.hover',
              borderRadius: 1,
              fontSize: '0.75rem',
              overflow: 'auto',
              maxHeight: 320,
            }}
          >
            {JSON.stringify(uiSchema, null, 2)}
          </Box>
        </Box>
      </Box>
    </Paper>
  )
}
