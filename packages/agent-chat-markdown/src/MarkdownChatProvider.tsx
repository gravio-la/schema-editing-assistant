import { useMemo } from 'react'
import type { ReactNode } from 'react'
import React from 'react'
import MuiMarkdown from 'mui-markdown'
import { Highlight, themes } from 'prism-react-renderer'
import type { PrismTheme } from 'prism-react-renderer'
import { MarkdownRendererContext } from '@graviola/agent-chat-components'
import { MermaidDiagram } from './MermaidDiagram'

export interface MarkdownChatProviderProps {
  children: ReactNode
  /** prism-react-renderer theme. Defaults to themes.oneDark. */
  prismTheme?: PrismTheme
  /** Render mermaid fenced code blocks as diagrams. Defaults to true. */
  enableMermaid?: boolean
}

/**
 * Pre override: intercepts ```mermaid blocks and renders them as diagrams.
 * All other pre/code blocks fall through to MuiMarkdown's Highlight renderer.
 */
function MermaidOrPre({ children }: { children?: ReactNode }) {
  const child = React.Children.count(children) === 1
    ? React.Children.toArray(children)[0]
    : null

  if (
    React.isValidElement(child) &&
    child.type === 'code' &&
    typeof (child.props as { className?: string }).className === 'string' &&
    (child.props as { className: string }).className.includes('mermaid')
  ) {
    const content = (child.props as { children?: unknown }).children
    return <MermaidDiagram chart={typeof content === 'string' ? content : ''} />
  }

  return <pre>{children}</pre>
}

export function MarkdownChatProvider({
  children,
  prismTheme = themes.oneDark,
  enableMermaid = true,
}: MarkdownChatProviderProps) {
  const contextValue = useMemo(
    () => ({
      renderMarkdown: (content: string): ReactNode => (
        <MuiMarkdown
          Highlight={Highlight}
          prismTheme={prismTheme as import('mui-markdown').PrismTheme}
          {...(enableMermaid ? { overrides: { pre: { component: MermaidOrPre } } } : {})}
        >
          {content}
        </MuiMarkdown>
      ),
    }),
    [prismTheme, enableMermaid],
  )

  return (
    <MarkdownRendererContext.Provider value={contextValue}>
      {children}
    </MarkdownRendererContext.Provider>
  )
}
