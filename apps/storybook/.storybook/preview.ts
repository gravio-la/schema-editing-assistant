import type { Preview } from '@storybook/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { createElement } from 'react'

const theme = createTheme()

const preview: Preview = {
  decorators: [
    (Story) => createElement(ThemeProvider, { theme }, createElement(Story)),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
