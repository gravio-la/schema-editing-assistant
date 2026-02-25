import { createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'

const config = {
  PROVIDER: process.env['PROVIDER'] ?? 'anthropic',
  ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'] ?? '',
  OLLAMA_BASE_URL: process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434/v1',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  PORT: Number(process.env['PORT'] ?? 3001),
  LOG_LEVEL: (process.env['LOG_LEVEL'] ?? 'debug') as string,
} as const

export function getModel() {
  if (config.PROVIDER === 'ollama') {
    return createOpenAI({ baseURL: config.OLLAMA_BASE_URL, apiKey: 'ollama' })('llama3.1')
  }
  return anthropic('claude-sonnet-4-6')
}

export default config
