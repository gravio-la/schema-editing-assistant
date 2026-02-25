import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { ChatMessageData } from '../types'

export interface StreamTestDisplayProps {
  messages: ChatMessageData[]
  input: string
  isLoading: boolean
  error?: string | undefined
  onInputChange: (value: string) => void
  onSubmit: () => void
}

export function StreamTestDisplay({
  messages,
  input,
  isLoading,
  error,
  onInputChange,
  onSubmit,
}: StreamTestDisplayProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, maxWidth: 600 }}>
      <Typography variant="h6">AI Stream Test</Typography>

      <Paper variant="outlined" sx={{ minHeight: 200, maxHeight: 400, overflow: 'auto', p: 1 }}>
        {messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            No messages yet. Send one to test streaming.
          </Typography>
        ) : (
          <List disablePadding>
            {messages.map((m) => (
              <ListItem
                key={m.id}
                sx={{
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                  pb: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {m.role}
                </Typography>
                <Paper
                  elevation={0}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    bgcolor: m.role === 'user' ? 'primary.light' : 'grey.100',
                    color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    borderRadius: 2,
                    maxWidth: '80%',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <Typography variant="body2">{m.content}</Typography>
                </Paper>
              </ListItem>
            ))}
          </List>
        )}
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">
              streaming…
            </Typography>
          </Box>
        )}
      </Paper>

      {error && (
        <Typography variant="body2" color="error">
          Error: {error}
        </Typography>
      )}

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        sx={{ display: 'flex', gap: 1 }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder="Send a message…"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={isLoading}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading || input.trim() === ''}
        >
          Send
        </Button>
      </Box>
    </Box>
  )
}
