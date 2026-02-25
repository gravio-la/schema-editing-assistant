import type { Preview } from '@storybook/react-vite'
import { ThemeProvider, createTheme } from '@mui/material/styles'

const theme = createTheme()

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <Story />
      </ThemeProvider>
    ),
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
