/**
 * Default API origin when `serverUrl` is missing or path-only. Without this,
 * `fetch('/api/chat')` resolves to the current page origin (e.g. Storybook :6006)
 * instead of the Hono server.
 */
const DEFAULT_LOCAL_API_ORIGIN = 'http://localhost:3001'

function ensureAbsoluteApiOrigin(serverUrl: string): string {
  const t = serverUrl.trim()
  if (t === '') return DEFAULT_LOCAL_API_ORIGIN
  if (t.startsWith('/') && !t.startsWith('//')) return DEFAULT_LOCAL_API_ORIGIN
  return t
}

/**
 * Build the chat POST URL. Accepts either the server origin (`http://localhost:3001`)
 * or a full path already ending with `/api/chat` (Storybook / env variants).
 */
export function resolveChatApiUrl(serverUrl: string): string {
  const trimmed = ensureAbsoluteApiOrigin(serverUrl).replace(/\/+$/, '')
  if (trimmed.endsWith('/api/chat')) return trimmed
  return `${trimmed}/api/chat`
}

/** Origin only, for `/api/session` and other non-chat routes. */
export function resolveServerOrigin(serverUrl: string): string {
  const trimmed = ensureAbsoluteApiOrigin(serverUrl).replace(/\/+$/, '')
  if (trimmed.endsWith('/api/chat')) return trimmed.slice(0, -'/api/chat'.length)
  return trimmed
}
