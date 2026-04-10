import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MarkdownChatProvider } from '@graviola/agent-chat-markdown'
import { App } from './App'

const rootEl = document.getElementById('root')
if (rootEl == null) {
  throw new Error('Missing #root')
}

createRoot(rootEl).render(
  <StrictMode>
    <MarkdownChatProvider>
      <App />
    </MarkdownChatProvider>
  </StrictMode>,
)
