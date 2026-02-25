import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { SchemaEditorDemo } from '@graviola/agent-chat-flow'

const meta: Meta<typeof SchemaEditorDemo> = {
  title: 'agent-chat-flow/SchemaEditorDemo',
  component: SchemaEditorDemo,
  parameters: {
    layout: 'fullscreen',
  },
}
export default meta
type Story = StoryObj<typeof SchemaEditorDemo>

// Mock fetch for demo without a live server
const mockFetch = (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
  const urlStr = String(url)

  if ((options?.method === undefined || options?.method === 'GET') && urlStr.includes('/api/schema/')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          jsonSchema: {
            type: 'object',
            properties: {
              firstName: { type: 'string', title: 'Vorname' },
              lastName: { type: 'string', title: 'Nachname' },
              email: { type: 'string', format: 'email', title: 'E-Mail' },
            },
            required: ['firstName', 'lastName', 'email'],
          },
          uiSchema: { email: { 'ui:widget': 'email' } },
          version: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
  }

  if (options?.method === 'POST' && urlStr.includes('/api/chat')) {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('0:"Ich habe das Formular aktualisiert."\n'))
        controller.close()
      },
    })
    return Promise.resolve(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-data-stream': 'v1' },
      }),
    )
  }

  return fetch(url, options)
}

export const Default: Story = {
  args: {
    serverUrl: 'http://localhost:3001',
    sessionId: 'demo-session-123',
    initialSchema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', title: 'Vorname' },
        lastName: { type: 'string', title: 'Nachname' },
        email: { type: 'string', format: 'email', title: 'E-Mail' },
      },
      required: ['firstName', 'lastName'],
    },
    initialUiSchema: {
      email: { 'ui:widget': 'email' },
    },
  },
  decorators: [
    (Story: React.ComponentType) => {
      const originalFetch = window.fetch
      window.fetch = mockFetch as typeof fetch
      setTimeout(() => { window.fetch = originalFetch }, 15000)
      return <Story />
    },
  ],
}

export const EmptySchema: Story = {
  args: {
    serverUrl: 'http://localhost:3001',
    sessionId: 'demo-empty',
    initialSchema: { type: 'object', properties: {}, required: [] },
    initialUiSchema: {},
  },
}
