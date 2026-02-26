import { useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import { ChatMessage } from './ChatMessage'
import type { ChatMessageData } from '../types'

export interface ChatMessageListProps {
  messages: ChatMessageData[]
  streamingMessageId?: string
  isStreaming?: boolean
  sx?: SxProps<Theme>
}

function ThinkingIndicator() {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', px: 1.5, py: 1 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            '@keyframes thinkingBounce': {
              '0%, 80%, 100%': { opacity: 0.3, transform: 'translateY(0)' },
              '40%': { opacity: 1, transform: 'translateY(-4px)' },
            },
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'text.secondary',
            animation: `thinkingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </Box>
  )
}

export function ChatMessageList({ messages, streamingMessageId, isStreaming = false, sx }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // Show the bouncing dots while the agent is processing but hasn't emitted
  // any assistant text yet (tool-calling phase). Once text starts streaming in,
  // the partial assistant message appears instead.
  const lastMessage = messages[messages.length - 1]
  const showThinkingIndicator = isStreaming && lastMessage?.role !== 'assistant'

  return (
    <Box
      sx={{
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 1.5,
        flexGrow: 1,
        ...sx,
      }}
    >
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          isStreaming={message.id === streamingMessageId}
        />
      ))}
      {showThinkingIndicator && <ThinkingIndicator />}
      <div ref={bottomRef} />
    </Box>
  )
}
