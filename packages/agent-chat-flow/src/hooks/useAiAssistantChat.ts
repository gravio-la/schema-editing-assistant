import { useContext } from 'react'
import { AiAssistantContext } from '../context/AiAssistantContext'
import type { AiAssistantContextValue } from '../context/AiAssistantContext'

export type { AiAssistantContextValue }

export function useAiAssistantChat(): AiAssistantContextValue {
  return useContext(AiAssistantContext)
}
