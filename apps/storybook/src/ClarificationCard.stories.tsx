import type { Meta, StoryObj } from '@storybook/react'
import { ClarificationCard } from '@graviola/agent-chat-components'

const meta: Meta<typeof ClarificationCard> = {
  title: 'agent-chat-components/ClarificationCard',
  component: ClarificationCard,
  tags: ['autodocs'],
  args: { onAnswer: () => {} },
}
export default meta
type Story = StoryObj<typeof ClarificationCard>

export const WithOptionsGerman: Story = {
  args: {
    clarification: {
      question: 'Meinen Sie ein Dropdown-Menü oder ein Autocomplete-Feld mit Suchfunktion?',
      options: ['Einfaches Dropdown', 'Autocomplete mit Suche', 'Radio-Buttons'],
      context: 'Sie haben "Dropdown" erwähnt — dies kann unterschiedlich implementiert werden.',
    },
  },
}

export const WithOptionsEnglish: Story = {
  args: {
    clarification: {
      question: 'Should this be a required field?',
      options: ['Yes, required', 'No, optional'],
    },
  },
}

export const FreeTextOnly: Story = {
  args: {
    clarification: {
      question: 'What label should this field have? Please provide the text you want displayed to users.',
    },
  },
}

export const Disabled: Story = {
  args: {
    clarification: {
      question: 'Meinen Sie ein Dropdown-Menü oder ein Autocomplete-Feld?',
      options: ['Einfaches Dropdown', 'Autocomplete mit Suche'],
    },
    disabled: true,
  },
}
