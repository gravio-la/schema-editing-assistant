import type { Meta, StoryObj } from '@storybook/react'
import { ChatMessageList } from '@graviola/agent-chat-components'

const meta: Meta<typeof ChatMessageList> = {
  title: 'agent-chat-components/ChatMessageList',
  component: ChatMessageList,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof ChatMessageList>

export const Empty: Story = {
  args: { messages: [] },
}

export const ShortConversation: Story = {
  args: {
    messages: [
      { id: '1', role: 'user', content: 'Hallo! Ich möchte ein Kontaktformular erstellen.' },
      { id: '2', role: 'assistant', content: 'Gerne! Welche Felder soll das Formular enthalten?' },
      { id: '3', role: 'user', content: 'Name, E-Mail und eine Nachricht.' },
      { id: '4', role: 'assistant', content: 'Ich habe die drei Felder hinzugefügt: name (string, Pflichtfeld), email (string, format: email, Pflichtfeld) und message (string, textarea).' },
    ],
  },
}

export const LongConversation: Story = {
  args: {
    messages: Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: i % 2 === 0
        ? `Können Sie das Feld "${['Name', 'E-Mail', 'Telefon', 'Adresse', 'Geburtsdatum', 'Kommentar'][i % 6]}" hinzufügen?`
        : 'Das Feld wurde erfolgreich hinzugefügt.',
      createdAt: new Date(Date.now() - (12 - i) * 30000).toISOString(),
    })),
  },
}

export const WithStreaming: Story = {
  args: {
    messages: [
      { id: '1', role: 'user', content: 'Füge ein Namensfeld hinzu.' },
      { id: '2', role: 'assistant', content: 'Ich füge das Feld gerade hinzu' },
    ],
    streamingMessageId: '2',
  },
}
