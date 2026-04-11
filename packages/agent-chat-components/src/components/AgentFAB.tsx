import { useCallback, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { useControlled } from '@mui/material/utils'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import type { SxProps, Theme } from '@mui/material/styles'
import { AgentStatusIndicator } from './AgentStatusIndicator'
import { ChatInput } from './ChatInput'
import { ChatMessageList } from './ChatMessageList'
import { ClarificationCard } from './ClarificationCard'
import { FormReplacementConfirmCard } from './FormReplacementConfirmCard'
import { useDraggable } from '../hooks/useDraggable'
import type { AgentStatus, ChatMessageData, ClarificationPayload, FormReplacementPayload } from '../types'
import { WandHutFabIcon } from './WandHutFabIcon'

export interface AgentFABProps {
  messages: ChatMessageData[]
  onSend: (message: string) => void
  isStreaming?: boolean
  streamingMessageId?: string
  pendingClarification?: ClarificationPayload | null
  onAnswerClarification?: (answer: string) => void
  pendingFormReplacement?: FormReplacementPayload | null
  onConfirmFormReplacement?: (confirmed: boolean) => void
  agentStatus?: AgentStatus['state']
  defaultPosition?: { x: number; y: number }
  /** Uncontrolled: initial panel visibility (ignored when `open` is set). */
  defaultOpen?: boolean
  /** Controlled: panel open state (`open !== undefined`). Use with `onOpenChange` to update. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Icon when the panel is collapsed; defaults to `WandHutFabIcon`. */
  collapsedFabIcon?: ReactNode
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
  pendingFormReplacement,
  onConfirmFormReplacement,
  agentStatus = 'idle',
  defaultPosition,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  collapsedFabIcon,
  title = 'AI Assistent',
  sx,
}: AgentFABProps) {
  const [open, setOpenInternal] = useControlled({
    controlled: openProp,
    default: defaultOpen,
    name: 'AgentFAB',
    state: 'open',
  })

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp !== undefined) {
        onOpenChange?.(next)
      } else {
        setOpenInternal(next)
      }
    },
    [openProp, onOpenChange, setOpenInternal],
  )

  const isOpen = Boolean(open)

  const { position, isDragging, handlePointerDown } = useDraggable(
    getDefaultPosition(defaultPosition),
  )

  if (!isOpen) {
    return (
      <Fab
        color="primary"
        aria-label="Open AI assistant"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 1300,
          '& svg': { fontSize: 28 },
          ...sx,
        }}
      >
        {collapsedFabIcon ?? <WandHutFabIcon />}
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
          onClick={() => setOpen(false)}
          sx={{ color: 'primary.contrastText', p: 0.5 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <CloseOutlined fontSize="small" />
        </IconButton>
      </Box>

      {/* Message list */}
      <ChatMessageList
        messages={messages}
        isStreaming={isStreaming}
        {...(streamingMessageId !== undefined ? { streamingMessageId } : {})}
        sx={{ flexGrow: 1, minHeight: 0 }}
      />

      {/* Footer — form replacement takes priority over clarification */}
      {pendingFormReplacement != null ? (
        <Box sx={{ p: 1, flexShrink: 0 }}>
          <FormReplacementConfirmCard
            payload={pendingFormReplacement}
            onConfirm={(confirmed) => onConfirmFormReplacement?.(confirmed)}
            disabled={isStreaming}
          />
        </Box>
      ) : pendingClarification != null ? (
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
