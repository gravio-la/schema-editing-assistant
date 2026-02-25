import { useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import { ChatMessage } from './ChatMessage'
import type { ChatMessageData } from '../types'

export interface ChatMessageListProps {
  messages: ChatMessageData[]
  streamingMessageId?: string
  sx?: SxProps<Theme>
}

export function ChatMessageList({ messages, streamingMessageId, sx }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      <div ref={bottomRef} />
    </Box>
  )
}
