import type { UIMessage } from 'ai'

/**
 * `convertToModelMessages` expects UI messages (`parts`), but callers may still
 * send legacy `{ role, content: string }` (e.g. curl/tests).
 */
export function normalizeClientMessages(
  raw: Array<{ role: string; content?: unknown; parts?: unknown }>,
): Omit<UIMessage, 'id'>[] {
  return raw.map((m) => {
    if (Array.isArray((m as { parts?: unknown }).parts)) {
      const { role, parts } = m as { role: UIMessage['role']; parts: UIMessage['parts'] }
      return { role, parts }
    }
    const content = m.content
    const text =
      typeof content === 'string'
        ? content
        : content == null
          ? ''
          : JSON.stringify(content)
    return {
      role: m.role as UIMessage['role'],
      parts: [{ type: 'text' as const, text }],
    }
  })
}
