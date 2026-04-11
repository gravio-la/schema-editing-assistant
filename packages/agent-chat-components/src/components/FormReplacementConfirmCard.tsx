import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined'
import type { SxProps, Theme } from '@mui/material/styles'
import type { FormReplacementPayload } from '../types'

export interface FormReplacementConfirmCardProps {
  payload: FormReplacementPayload
  onConfirm: (confirmed: boolean) => void
  disabled?: boolean
  sx?: SxProps<Theme>
}

export function FormReplacementConfirmCard({
  payload,
  onConfirm,
  disabled = false,
  sx,
}: FormReplacementConfirmCardProps) {
  const isRepair = payload.toolName === 'repair_form'

  return (
    <Card
      data-testid="form-replacement-confirm-card"
      variant="outlined"
      sx={{
        borderColor: isRepair ? 'warning.main' : 'primary.light',
        ...sx,
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <WarningAmberOutlined
            fontSize="small"
            color={isRepair ? 'warning' : 'primary'}
            sx={{ mt: '2px', flexShrink: 0 }}
          />
          <Box>
            <Typography variant="h6" sx={{ fontSize: '0.95rem', lineHeight: 1.4 }}>
              The assistant wants to replace the entire form.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isRepair
                ? 'This overwrites your current form. You can undo the previous version afterward.'
                : 'Confirm to apply the proposed jsonSchema and uiSchema.'}
            </Typography>
            {isRepair && (
              <Chip
                data-testid="form-replacement-repair-hint-chip"
                size="small"
                label="Previous form can be undone"
                color="warning"
                variant="outlined"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button
            data-testid="form-replacement-cancel-button"
            variant="outlined"
            size="small"
            disabled={disabled}
            onClick={() => onConfirm(false)}
          >
            Cancel
          </Button>
          <Button
            data-testid="form-replacement-confirm-button"
            variant="contained"
            size="small"
            color={isRepair ? 'warning' : 'primary'}
            disabled={disabled}
            onClick={() => onConfirm(true)}
          >
            Replace form
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}
