import { Hono } from 'hono'
import { streamText } from 'ai'
import type { CoreMessage } from 'ai'
import { getModel } from '../config'
import logger from '../logger'

const chat = new Hono()

chat.post('/', async (c) => {
  const body = await c.req.json<{ messages: CoreMessage[] }>()

  logger.info('chat request', { messageCount: body.messages.length })

  const result = streamText({
    model: getModel(),
    messages: body.messages,
    system: "You are a helpful assistant for building JSON Schema forms. Respond concisely in the user's language.",
  })

  return result.toDataStreamResponse()
})

export default chat
