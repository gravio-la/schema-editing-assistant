import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import type { AgentStatus } from '../types'

export interface AgentStatusIndicatorProps {
  status: AgentStatus['state']
  sx?: SxProps<Theme>
}

const DOT_SIZE = 10

export function AgentStatusIndicator({ status, sx }: AgentStatusIndicatorProps) {
  const colorMap: Record<AgentStatus['state'], string> = {
    idle: 'grey.400',
    thinking: 'common.white',
    streaming: 'success.light',
    error: 'error.light',
  }

  const animationMap: Record<AgentStatus['state'], string | undefined> = {
    idle: undefined,
    thinking: 'agentPulse 1.5s ease-in-out infinite',
    streaming: 'agentPulse 0.8s ease-in-out infinite',
    error: undefined,
  }

  return (
    <Box
      aria-label={`Agent status: ${status}`}
      sx={{
        '@keyframes agentPulse': {
          '0%': { opacity: 1 },
          '50%': { opacity: 0.3 },
          '100%': { opacity: 1 },
        },
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: '50%',
        bgcolor: colorMap[status],
        animation: animationMap[status],
        flexShrink: 0,
        ...sx,
      }}
    />
  )
}
