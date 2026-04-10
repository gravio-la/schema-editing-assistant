/** Text from a user message — supports legacy `content` or UI `parts` (useChat v6). */
export function textFromUserMessage(m: {
  role: string
  content?: unknown
  parts?: unknown
}): string {
  if (Array.isArray(m.parts)) {
    return (m.parts as Array<{ type?: string; text?: string }>)
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('')
  }
  const c = m.content
  if (typeof c === 'string') return c
  if (c == null) return ''
  try {
    return JSON.stringify(c)
  } catch {
    return String(c)
  }
}

export function extractLastUserTextFromChatBody(body: {
  message?: string
  messages?: Array<{ role: string; content?: unknown; parts?: unknown }>
}): string {
  if (body.message != null && String(body.message).trim() !== '') return String(body.message)
  const msgs = body.messages ?? []
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.role === 'user') return textFromUserMessage(m)
  }
  return ''
}
