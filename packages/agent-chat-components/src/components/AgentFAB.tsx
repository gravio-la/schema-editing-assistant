import { useState } from 'react'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import type { SxProps, Theme } from '@mui/material/styles'
import { AgentStatusIndicator } from './AgentStatusIndicator'
import { ChatInput } from './ChatInput'
import { ChatMessageList } from './ChatMessageList'
import { ClarificationCard } from './ClarificationCard'
import { useDraggable } from '../hooks/useDraggable'
import type { AgentStatus, ChatMessageData, ClarificationPayload } from '../types'

export interface AgentFABProps {
  messages: ChatMessageData[]
  onSend: (message: string) => void
  isStreaming?: boolean
  streamingMessageId?: string
  pendingClarification?: ClarificationPayload | null
  onAnswerClarification?: (answer: string) => void
  agentStatus?: AgentStatus['state']
  defaultPosition?: { x: number; y: number }
  title?: string
  sx?: SxProps<Theme>
}

const PANEL_WIDTH = 380
const PANEL_HEIGHT = 520

function getDefaultPosition(supplied?: { x: number; y: number }) {
  if (supplied != null) return supplied
  if (typeof window === 'undefined') return { x: 40, y: 40 }
  return {
    x: window.innerWidth - PANEL_WIDTH - 24,
    y: window.innerHeight - PANEL_HEIGHT - 24,
  }
}

export function AgentFAB({
  messages,
  onSend,
  isStreaming = false,
  streamingMessageId,
  pendingClarification,
  onAnswerClarification,
  agentStatus = 'idle',
  defaultPosition,
  title = 'AI Assistent',
  sx,
}: AgentFABProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { position, isDragging, handlePointerDown } = useDraggable(
    getDefaultPosition(defaultPosition),
  )

  if (!isOpen) {
    return (
      <Fab
        color="primary"
        aria-label="Open AI assistant"
        onClick={() => setIsOpen(true)}
        sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1300, ...sx }}
      >
        <ChatBubbleOutlineOutlined />
      </Fab>
    )
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1300,
        borderRadius: 2,
        overflow: 'hidden',
        userSelect: isDragging ? 'none' : 'auto',
        ...sx,
      }}
    >
      {/* Header — drag handle */}
      <Box
        onPointerDown={handlePointerDown}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          cursor: isDragging ? 'grabbing' : 'grab',
          flexShrink: 0,
        }}
      >
        <AgentStatusIndicator status={agentStatus} sx={{ flexShrink: 0 }} />
        <Typography variant="subtitle2" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton
          size="small"
          aria-label="Close AI assistant"
          onClick={() => setIsOpen(false)}
          sx={{ color: 'primary.contrastText', p: 0.5 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <CloseOutlined fontSize="small" />
        </IconButton>
      </Box>

      {/* Message list */}
      <ChatMessageList
        messages={messages}
        {...(streamingMessageId !== undefined ? { streamingMessageId } : {})}
        sx={{ flexGrow: 1, minHeight: 0 }}
      />

      {/* Footer */}
      {pendingClarification != null ? (
        <Box sx={{ p: 1, flexShrink: 0 }}>
          <ClarificationCard
            clarification={pendingClarification}
            onAnswer={(answer) => onAnswerClarification?.(answer)}
            disabled={isStreaming}
          />
        </Box>
      ) : (
        <ChatInput onSend={onSend} disabled={isStreaming} sx={{ flexShrink: 0 }} />
      )}
    </Paper>
  )
}
