import { useCallback, useMemo, useState } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import Fab from '@mui/material/Fab'
import CircularProgress from '@mui/material/CircularProgress'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined'
import {
  AiAssistantProvider,
  useAiAssistantChat,
  type AgentSessionCustomRenderer,
  type ToolResult,
} from '@graviola/agent-chat-flow'
import { DebugPanel } from './DebugPanel'
import { createEmptySchemaState } from './testSchema'
import { executeToolWithLog, type ToolLogEntry } from './mockToolExecutor'

const SERVER_URL = import.meta.env.VITE_AGENT_SERVER_URL ?? 'http://localhost:3001'

const theme = createTheme()

/** `?lang=de` → German session (`POST /api/session`). Default `en`. Used by e2e / manual checks. */
function sessionLanguageFromUrl(): 'de' | 'en' {
  if (typeof window === 'undefined') return 'en'
  return new URLSearchParams(window.location.search).get('lang') === 'de' ? 'de' : 'en'
}

function welcomeMessageForLanguage(lang: 'de' | 'en'): string {
  return lang === 'de'
    ? 'Hallo! Ich helfe dir beim Formular. Beschreib einfach, welche Felder du brauchst — ich richte das für dich ein.'
    : 'Hi! I can help you build your form. Describe what fields you need and I’ll set them up.'
}

/** Optional custom renderers for POST /api/session (like forms-designer). */
const DEBUG_CUSTOM_RENDERERS: AgentSessionCustomRenderer[] = [
  {
    name: 'Debug combo',
    description: 'Example custom renderer entry for session prompt.',
    jsonSchema: {
      type: 'array',
      uniqueItems: true,
      items: { type: 'string', enum: ['a', 'b'] },
    },
    uiOptions: { format: 'combo' },
  },
]

function AssistantOpenFab() {
  const { openChat, isCreating, hasSession } = useAiAssistantChat()
  if (hasSession) return null
  return (
    <Fab
      color="primary"
      aria-label="Open AI assistant"
      onClick={() => void openChat()}
      disabled={isCreating}
      data-testid="open-assistant-fab"
      sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1250 }}
    >
      {isCreating ? <CircularProgress size={24} color="inherit" /> : <ChatBubbleOutlineOutlined />}
    </Fab>
  )
}

export function App() {
  const sessionLang = sessionLanguageFromUrl()
  const [schema, setSchema] = useState(createEmptySchemaState)
  const [toolLog, setToolLog] = useState<ToolLogEntry[]>([])

  const appendLog = useCallback((e: ToolLogEntry) => {
    setToolLog((prev) => [...prev, e])
  }, [])

  const onExecuteTool = useCallback(
    (toolName: string, args: Record<string, unknown>): ToolResult => {
      return executeToolWithLog(setSchema, appendLog, toolName, args)
    },
    [appendLog],
  )

  const sessionSlot = useMemo(
    () => (
      <SessionDebugSlot
        schema={schema}
        toolLog={toolLog}
      />
    ),
    [schema, toolLog],
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AiAssistantProvider
        serverUrl={SERVER_URL}
        language={sessionLang}
        welcomeMessage={welcomeMessageForLanguage(sessionLang)}
        customRenderers={DEBUG_CUSTOM_RENDERERS}
        schema={{ jsonSchema: schema.jsonSchema, uiSchema: schema.uiSchema }}
        onExecuteTool={onExecuteTool}
      >
        <AssistantOpenFab />
        {sessionSlot}
      </AiAssistantProvider>
    </ThemeProvider>
  )
}

/** Reads session from context; must be under AiAssistantProvider. */
function SessionDebugSlot({
  schema,
  toolLog,
}: {
  schema: ReturnType<typeof createEmptySchemaState>
  toolLog: ToolLogEntry[]
}) {
  const { sessionId, isCreating } = useAiAssistantChat()
  return (
    <DebugPanel
      sessionId={sessionId}
      isCreating={isCreating}
      toolLog={toolLog}
      jsonSchema={schema.jsonSchema}
      uiSchema={schema.uiSchema}
    />
  )
}

export default App
