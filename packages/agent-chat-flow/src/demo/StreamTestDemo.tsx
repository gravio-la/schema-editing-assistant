import { useChat } from 'ai/react'
import { StreamTestDisplay } from '@graviola/agent-chat-components'
import type { ChangeEvent } from 'react'

export interface StreamTestDemoProps {
  /** URL of the POST /api/chat endpoint */
  serverUrl?: string
}

export function StreamTestDemo({
  serverUrl = 'http://localhost:3001/api/chat',
}: StreamTestDemoProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: serverUrl,
  })

  return (
    <StreamTestDisplay
      messages={messages.map((m) => ({
        id: m.id,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))}
      input={input}
      isLoading={isLoading}
      error={error?.message}
      onInputChange={(v: string) =>
        handleInputChange({ target: { value: v } } as ChangeEvent<HTMLInputElement>)
      }
      onSubmit={() => handleSubmit()}
    />
  )
}
