import { createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

/** Prefer GOOGLE_API_KEY; falls back to GOOGLE_GENERATIVE_AI_API_KEY (AI SDK default name). */
function resolveGoogleApiKey(): string {
  return (
    process.env['GOOGLE_API_KEY']?.trim() ||
    process.env['GOOGLE_GENERATIVE_AI_API_KEY']?.trim() ||
    ''
  )
}

const googleApiKey = resolveGoogleApiKey()
const google = createGoogleGenerativeAI(googleApiKey !== '' ? { apiKey: googleApiKey } : {})

const config = {
  PROVIDER: process.env['PROVIDER'] ?? 'anthropic',
  ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'] ?? '',
  OLLAMA_BASE_URL: process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434/v1',
  OLLAMA_LANGUAGE_MODEL: process.env['OLLAMA_LANGUAGE_MODEL'] ?? 'llama3.1',
  GEMINI_LANGUAGE_MODEL: process.env['GEMINI_LANGUAGE_MODEL'] ?? 'gemini-2.5-flash',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  PORT: Number(process.env['PORT'] ?? 3001),
  LOG_LEVEL: (process.env['LOG_LEVEL'] ?? 'debug') as string,
} as const

export function getModel() {
  if (config.PROVIDER === 'ollama') {
    return createOpenAI({ baseURL: config.OLLAMA_BASE_URL, apiKey: 'ollama' })(config.OLLAMA_LANGUAGE_MODEL)
  }
  if (config.PROVIDER === 'gemini') {
    return google(config.GEMINI_LANGUAGE_MODEL)
  }
  return anthropic('claude-sonnet-4-6')
}

export default config
