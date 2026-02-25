import type { Meta, StoryObj } from '@storybook/react'
import { AgentFAB } from '@graviola/agent-chat-components'

const sampleMessages = [
  { id: '1', role: 'user' as const, content: 'Füge ein Feld für die E-Mail-Adresse hinzu.' },
  { id: '2', role: 'assistant' as const, content: 'Ich habe ein E-Mail-Feld (format: email) hinzugefügt.' },
  { id: '3', role: 'user' as const, content: 'Und eine Telefonnummer?' },
  { id: '4', role: 'assistant' as const, content: 'Das Feld "Telefonnummer" wurde als optionales Feld vom Typ string hinzugefügt.' },
]

const meta: Meta<typeof AgentFAB> = {
  title: 'agent-chat-components/AgentFAB',
  component: AgentFAB,
  tags: ['autodocs'],
  args: {
    onSend: () => {},
    onAnswerClarification: () => {},
  },
  parameters: {
    layout: 'fullscreen',
  },
}
export default meta
type Story = StoryObj<typeof AgentFAB>

export const Collapsed: Story = {
  args: {
    messages: [],
  },
}

export const WithMessages: Story = {
  args: {
    messages: sampleMessages,
    defaultPosition: { x: 40, y: 80 },
  },
}

export const StreamingState: Story = {
  args: {
    messages: [
      ...sampleMessages,
      { id: '5', role: 'assistant' as const, content: 'Ich füge das Adressfeld gerade hinzu' },
    ],
    isStreaming: true,
    streamingMessageId: '5',
    agentStatus: 'streaming',
    defaultPosition: { x: 40, y: 80 },
  },
}

export const WithClarification: Story = {
  args: {
    messages: sampleMessages,
    pendingClarification: {
      question: 'Meinen Sie ein Dropdown-Menü oder ein Autocomplete-Feld?',
      options: ['Einfaches Dropdown', 'Autocomplete mit Suche'],
      context: 'Sie haben "Dropdown" erwähnt — dies kann unterschiedlich implementiert werden.',
    },
    defaultPosition: { x: 40, y: 80 },
  },
}

export const ThinkingState: Story = {
  args: {
    messages: sampleMessages,
    agentStatus: 'thinking',
    defaultPosition: { x: 40, y: 80 },
  },
}

export const BottomLeft: Story = {
  args: {
    messages: sampleMessages,
    defaultPosition: { x: 20, y: 400 },
  },
}
