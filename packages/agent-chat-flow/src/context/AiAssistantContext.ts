import { createContext } from 'react'

export interface AiAssistantContextValue {
  /** Create a session (if not yet created) and open the chat panel. */
  openChat: () => Promise<void>
  closeChat: () => void
  isOpen: boolean
  /** True while the session POST + schema seed PUT are in-flight. */
  isCreating: boolean
  sessionId: string | undefined
  /** True once a session has been successfully created. */
  hasSession: boolean
}

const noop = () => {}
const noopAsync = () => Promise.resolve()

export const AiAssistantContext = createContext<AiAssistantContextValue>({
  openChat: noopAsync,
  closeChat: noop,
  isOpen: false,
  isCreating: false,
  sessionId: undefined,
  hasSession: false,
})
