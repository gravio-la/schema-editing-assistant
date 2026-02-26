import type { Meta, StoryObj } from '@storybook/react-vite'
import { StreamTestDemo } from '@graviola/agent-chat-flow'

const meta: Meta<typeof StreamTestDemo> = {
  title: 'StreamTest/Live (real server)',
  component: StreamTestDemo,
  parameters: {
    docs: {
      description: {
        component:
          'Connects to the real Hono server. Requires `bun run dev:server` to be running on port 3001. Or provide the server URL as an argument.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof StreamTestDemo>

export const LocalServer: Story = {
  args: {
    serverUrl: 'http://localhost:3001/api/chat',
  },
}
