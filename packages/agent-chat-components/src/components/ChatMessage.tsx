import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ChatMessageData } from '../types'
import { useMarkdownRenderer } from '../context/MarkdownRendererContext'

export interface ChatMessageProps {
  message: ChatMessageData
  isStreaming?: boolean
  sx?: SxProps<Theme>
}

export function ChatMessage({ message, isStreaming = false, sx }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const { renderMarkdown } = useMarkdownRenderer()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        ...sx,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          px: 1.5,
          py: 1,
          maxWidth: '80%',
          bgcolor: isUser
            ? 'primary.main'
            : (theme) => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'),
          color: isUser ? 'primary.contrastText' : 'text.primary',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          '& .streaming-content::after': isStreaming
            ? {
                content: '"▋"',
                display: 'inline-block',
                animation: 'blink 1s step-end infinite',
                '@keyframes blink': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0 },
                },
              }
            : {},
        }}
      >
        {!isUser && renderMarkdown !== null ? (
          <Box
            className={isStreaming ? 'streaming-content' : undefined}
            sx={{
              '& > *:first-of-type': { mt: 0 },
              '& > *:last-child': { mb: 0 },
              '& pre': { borderRadius: 1, overflow: 'auto' },
              '& code:not(pre > code)': {
                bgcolor: 'action.hover',
                px: 0.5,
                borderRadius: 0.5,
                fontFamily: 'monospace',
                fontSize: '0.85em',
              },
            }}
          >
            {renderMarkdown(message.content)}
          </Box>
        ) : (
          <Typography
            variant="body2"
            {...(isStreaming ? { className: 'streaming-content' } : {})}
            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {message.content}
          </Typography>
        )}
      </Paper>

      {message.createdAt != null && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ mt: 0.25, px: 0.5 }}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
      )}
    </Box>
  )
}
