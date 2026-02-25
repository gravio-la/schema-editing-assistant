import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

/** Renders a markdown string to React nodes. Injected via MarkdownChatProvider. */
export type MarkdownRenderer = (content: string) => ReactNode

export interface MarkdownRendererContextValue {
  renderMarkdown: MarkdownRenderer | null
}

export const MarkdownRendererContext = createContext<MarkdownRendererContextValue>({
  renderMarkdown: null,
})

export function useMarkdownRenderer(): MarkdownRendererContextValue {
  return useContext(MarkdownRendererContext)
}
