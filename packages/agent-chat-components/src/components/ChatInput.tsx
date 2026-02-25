import { useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import SendOutlined from '@mui/icons-material/SendOutlined'
import type { SxProps, Theme } from '@mui/material/styles'

export interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  sx?: SxProps<Theme>
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Type a message…', sx }: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    const trimmed = value.trim()
    if (trimmed.length === 0) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 0.5,
        p: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        ...sx,
      }}
    >
      <TextField
        multiline
        maxRows={4}
        fullWidth
        size="small"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        sx={{ flexGrow: 1 }}
      />
      <IconButton
        color="primary"
        disabled={disabled || value.trim().length === 0}
        onClick={handleSend}
        aria-label="Send message"
        size="medium"
      >
        <SendOutlined />
      </IconButton>
    </Box>
  )
}
