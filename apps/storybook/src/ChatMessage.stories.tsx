import type { Meta, StoryObj } from '@storybook/react'
import { ChatMessage } from '@graviola/agent-chat-components'

const meta: Meta<typeof ChatMessage> = {
  title: 'agent-chat-components/ChatMessage',
  component: ChatMessage,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof ChatMessage>

export const UserMessage: Story = {
  args: {
    message: {
      id: '1',
      role: 'user',
      content: 'Füge bitte ein Pflichtfeld für den Vornamen hinzu.',
      createdAt: new Date().toISOString(),
    },
  },
}

export const AssistantMessage: Story = {
  args: {
    message: {
      id: '2',
      role: 'assistant',
      content: 'Ich habe ein Pflichtfeld "Vorname" (firstName) vom Typ string zum Formular hinzugefügt.',
      createdAt: new Date().toISOString(),
    },
  },
}

export const StreamingMessage: Story = {
  args: {
    message: {
      id: '3',
      role: 'assistant',
      content: 'Ich füge das Feld gerade hinzu',
    },
    isStreaming: true,
  },
}

export const LongContent: Story = {
  args: {
    message: {
      id: '4',
      role: 'assistant',
      content:
        'I have added a complete address block to your form. It includes: Straße (street), Hausnummer (house number), PLZ (postal code), Ort (city), and Land (country). The country field uses an enum with common European countries. All fields are required except for the second address line. The UI schema has been configured with appropriate layout hints for address forms.',
      createdAt: new Date().toISOString(),
    },
  },
}
