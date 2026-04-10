import type { LanguageModel } from 'ai'
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

/** Read from env on each call — avoids stale values when Bun --hot caches modules or .env updates after first load. */
export function getProvider(): 'anthropic' | 'ollama' | 'gemini' {
  const raw = (process.env['PROVIDER'] ?? 'anthropic').trim().toLowerCase()
  if (raw === 'ollama') return 'ollama'
  // common aliases / docs say "Google"
  if (raw === 'gemini' || raw === 'google') return 'gemini'
  return 'anthropic'
}

const config = {
  ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'] ?? '',
  OLLAMA_BASE_URL: process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434/v1',
  OLLAMA_LANGUAGE_MODEL: process.env['OLLAMA_LANGUAGE_MODEL'] ?? 'llama3.1',
  GEMINI_LANGUAGE_MODEL: process.env['GEMINI_LANGUAGE_MODEL'] ?? 'gemini-2.5-flash',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  PORT: Number(process.env['PORT'] ?? 3001),
  LOG_LEVEL: (process.env['LOG_LEVEL'] ?? 'debug') as string,
  get PROVIDER() {
    return getProvider()
  },
} as const

export function getModel(): LanguageModel {
  const provider = getProvider()
  if (provider === 'ollama') {
    const baseURL =
      process.env['OLLAMA_BASE_URL']?.trim() || 'http://localhost:11434/v1'
    const name = process.env['OLLAMA_LANGUAGE_MODEL']?.trim() || 'llama3.1'
    return createOpenAI({ baseURL, apiKey: 'ollama' })(name)
  }
  if (provider === 'gemini') {
    const key = resolveGoogleApiKey()
    const gemini = createGoogleGenerativeAI(key !== '' ? { apiKey: key } : {})
    const modelId =
      process.env['GEMINI_LANGUAGE_MODEL']?.trim() || 'gemini-2.5-flash'
    return gemini(modelId)
  }
  return anthropic('claude-sonnet-4-6')
}

export default config
