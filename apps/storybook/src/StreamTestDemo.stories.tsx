import type { Meta, StoryObj, Decorator } from '@storybook/react-vite'
import type { ComponentType } from 'react'
import { StreamTestDemo } from '@graviola/agent-chat-flow'

// ── Mock fetch — emulates the Vercel AI SDK v4 data stream protocol ───────────
//
// Text token:  0:"<json-stringified-char>"\n
// Finish:      d:{"finishReason":"stop","usage":{...}}\n

const MOCK_REPLY =
  'This is a mock streaming response. ' +
  'The Vercel AI SDK data-stream protocol is working correctly end-to-end!'

function buildMockFetch(): typeof globalThis.fetch {
  return async (_url, _opts) => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        await new Promise((r) => setTimeout(r, 300))
        for (const char of MOCK_REPLY) {
          controller.enqueue(encoder.encode(`0:${JSON.stringify(char)}\n`))
          await new Promise((r) => setTimeout(r, 20))
        }
        controller.enqueue(
          encoder.encode(
            `d:${JSON.stringify({
              finishReason: 'stop',
              usage: { promptTokens: 12, completionTokens: MOCK_REPLY.length },
            })}\n`,
          ),
        )
        controller.close()
      },
    })
    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

const withMockFetch: Decorator = (Story: ComponentType) => {
  globalThis.fetch = buildMockFetch()
  return <Story />
}

const meta: Meta<typeof StreamTestDemo> = {
  title: 'StreamTest/Demo (mock stream)',
  component: StreamTestDemo,
  decorators: [withMockFetch],
  parameters: {
    docs: {
      description: {
        component:
          'Wires `useChat` to a mock endpoint. Type any message and hit Send to see ' +
          'simulated token-by-token streaming. For the real server run `bun run dev:server`.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof StreamTestDemo>

export const MockStreaming: Story = {
  args: {
    serverUrl: 'http://mock/api/chat',
  },
}
