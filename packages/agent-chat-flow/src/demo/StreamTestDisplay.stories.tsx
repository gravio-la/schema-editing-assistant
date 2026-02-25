import type { Meta, StoryObj } from '@storybook/react-vite'
import { StreamTestDisplay } from '@graviola/agent-chat-components'

const meta: Meta<typeof StreamTestDisplay> = {
  title: 'StreamTest/Display (static)',
  component: StreamTestDisplay,
  args: {
    onInputChange: () => {},
    onSubmit: () => {},
  },
}

export default meta
type Story = StoryObj<typeof StreamTestDisplay>

export const WithMessages: Story = {
  args: {
    messages: [
      { id: '1', role: 'user', content: 'Hello, can you help me add a name field?' },
      {
        id: '2',
        role: 'assistant',
        content:
          "Sure! I'll add a required \"name\" string field to the root schema. Done — the schema now has a top-level `name` property marked as required.",
      },
      { id: '3', role: 'user', content: 'Füge auch ein Pflichtfeld für die E-Mail-Adresse hinzu.' },
      {
        id: '4',
        role: 'assistant',
        content:
          'Erledigt. Ich habe ein `email`-Feld mit `format: "email"` und `ui:widget: "email"` hinzugefügt und als Pflichtfeld markiert.',
      },
    ],
    input: '',
    isLoading: false,
  },
}

export const Streaming: Story = {
  args: {
    messages: [
      { id: '1', role: 'user', content: 'Add a phone number field.' },
      { id: '2', role: 'assistant', content: "Adding a `phone` field with format `tel`…" },
    ],
    input: '',
    isLoading: true,
  },
}

export const Empty: Story = {
  args: {
    messages: [],
    input: '',
    isLoading: false,
  },
}

export const WithError: Story = {
  args: {
    messages: [],
    input: 'test',
    isLoading: false,
    error: 'Failed to connect to server at localhost:3001',
  },
}

export const Composing: Story = {
  args: {
    messages: [
      { id: '1', role: 'user', content: 'Hello!' },
      { id: '2', role: 'assistant', content: 'Hi! How can I help you build your form?' },
    ],
    input: 'Add a required email field',
    isLoading: false,
  },
}
