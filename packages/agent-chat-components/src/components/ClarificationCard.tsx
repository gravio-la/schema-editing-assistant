import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ClarificationPayload } from '../types'

export interface ClarificationCardProps {
  clarification: ClarificationPayload
  onAnswer: (answer: string) => void
  disabled?: boolean
  sx?: SxProps<Theme>
}

export function ClarificationCard({ clarification, onAnswer, disabled = false, sx }: ClarificationCardProps) {
  const [freeText, setFreeText] = useState('')

  const handleFreeTextSend = () => {
    const trimmed = freeText.trim()
    if (trimmed.length === 0) return
    onAnswer(trimmed)
    setFreeText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleFreeTextSend()
    }
  }

  return (
    <Card variant="outlined" sx={{ borderColor: 'primary.light', ...sx }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <InfoOutlined fontSize="small" color="primary" sx={{ mt: '2px', flexShrink: 0 }} />
          <Box>
            <Typography variant="h6" sx={{ fontSize: '0.95rem', lineHeight: 1.4 }}>
              {clarification.question}
            </Typography>
            {clarification.context != null && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {clarification.context}
              </Typography>
            )}
          </Box>
        </Box>

        {clarification.options != null && clarification.options.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {clarification.options.map((option) => (
              <Chip
                key={option}
                label={option}
                clickable={!disabled}
                disabled={disabled}
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => { if (!disabled) onAnswer(option) }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            multiline
            size="small"
            fullWidth
            placeholder="Type your answer…"
            value={freeText}
            disabled={disabled}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            size="small"
            disabled={disabled || freeText.trim().length === 0}
            onClick={handleFreeTextSend}
            sx={{ flexShrink: 0, alignSelf: 'flex-end' }}
          >
            Send
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}
