import React, { useState, useEffect, useRef } from 'react'
import { MarkdownChatProvider } from '@graviola/agent-chat-markdown'
import type { Meta, StoryObj } from '@storybook/react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import {
  ChatMessageList,
  ChatInput,
  AgentStatusIndicator,
  ClarificationCard,
} from '@graviola/agent-chat-components'
import type { ChatMessageData, ClarificationPayload } from '@graviola/agent-chat-components'

import { useSchemaAgent, useSchemaSync } from '@graviola/agent-chat-flow'
import type { SchemaState } from '@graviola/agent-chat-flow'

// ── Inline schema code block ──────────────────────────────────────────────────

function SchemaBlock({ label, value }: { label: string; value: Record<string, unknown> }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Typography
        variant="overline"
        sx={{ px: 2, pt: 1.5, pb: 0.5, lineHeight: 1.2, color: '#888', flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Divider sx={{ borderColor: '#333' }} />
      <Box
        component="pre"
        sx={{
          bgcolor: '#1e1e1e',
          color: '#d4d4d4',
          fontFamily: '"Fira Code", "Cascadia Code", monospace',
          fontSize: 12,
          p: 2,
          m: 0,
          overflow: 'auto',
          flex: 1,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {JSON.stringify(value, null, 2)}
      </Box>
    </Box>
  )
}

// ── Core debugger (requires sessionId) ───────────────────────────────────────

interface SchemaDebuggerProps {
  serverUrl: string
  sessionId: string
}

function SchemaDebugger({ serverUrl, sessionId }: SchemaDebuggerProps) {
  const [schemaState, setSchemaState] = useState<SchemaState>({
    jsonSchema: { type: 'object', properties: {} },
    uiSchema: {},
    version: 0,
  })
  // Incremented when a streaming response completes so useSchemaSync re-fetches
  // even when the local schemaVersion hasn't advanced yet.
  const [schemaRefreshToken, setSchemaRefreshToken] = useState(0)

  const {
    messages,
    sendMessage,
    isStreaming,
    pendingClarification,
    answerClarification,
    agentStatus,
  } = useSchemaAgent({ serverUrl, sessionId })

  // Detect streaming completion (true → false) and trigger a schema refetch.
  const wasStreamingRef = useRef(false)
  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming) {
      setSchemaRefreshToken((t) => t + 1)
    }
    wasStreamingRef.current = isStreaming
  }, [isStreaming])

  useSchemaSync({
    serverUrl,
    sessionId,
    schemaVersion: schemaState.version,
    onSchemaUpdate: setSchemaState,
    refreshToken: schemaRefreshToken,
  })

  const streamingMessageId =
    isStreaming && messages.length > 0 ? messages[messages.length - 1]?.id : undefined

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Left: schema panels ─────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: '#1e1e1e',
          borderRight: 1,
          borderColor: '#333',
        }}
      >
        <SchemaBlock
          label={`JSON Schema  ·  v${schemaState.version}`}
          value={schemaState.jsonSchema}
        />
        <Divider sx={{ borderColor: '#333', flexShrink: 0 }} />
        <SchemaBlock label="UI Schema" value={schemaState.uiSchema} />
      </Box>

      {/* ── Right: chat panel ───────────────────────────────────────── */}
      <Paper
        elevation={0}
        square
        sx={{
          width: 420,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderLeft: 1,
          borderColor: 'divider',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              AI Assistent
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {sessionId.slice(0, 8)}…
            </Typography>
          </Box>
          <AgentStatusIndicator status={agentStatus} />
        </Box>

        {/* Message list */}
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChatMessageList
            messages={messages}
            {...(streamingMessageId !== undefined ? { streamingMessageId } : {})}
          />
        </Box>

        <Divider />

        {/* Footer: clarification card or chat input */}
        <Box sx={{ flexShrink: 0 }}>
          {pendingClarification ? (
            <ClarificationCard
              clarification={pendingClarification}
              onAnswer={answerClarification}
              disabled={isStreaming}
            />
          ) : (
            <ChatInput onSend={sendMessage} disabled={isStreaming} />
          )}
        </Box>
      </Paper>
    </Box>
  )
}

// ── Session-creating wrapper ──────────────────────────────────────────────────
// Creates a real session via POST /api/session, then renders SchemaDebugger.

interface LiveConnectProps {
  serverUrl: string
  language: 'de' | 'en'
}

function LiveConnect({ serverUrl, language }: LiveConnectProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSession = async () => {
    setIsCreating(true)
    setError(null)
    try {
      const res = await fetch(`${serverUrl}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`${res.status}: ${text}`)
      }
      const data = (await res.json()) as { sessionId: string }
      setSessionId(data.sessionId)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsCreating(false)
    }
  }

  if (sessionId) {
    return (
      <MarkdownChatProvider>
        <SchemaDebugger serverUrl={serverUrl} sessionId={sessionId} />
      </MarkdownChatProvider>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 2,
        p: 4,
      }}
    >
      <Typography variant="h6">FormsWizard Schema Debugger</Typography>
      <Typography variant="body2" color="text.secondary">
        Server:{' '}
        <Box component="code" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 }}>
          {serverUrl}
        </Box>
      </Typography>

      {error && (
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          {error}
          <br />
          Make sure <code>bun run dev:server</code> is running.
        </Alert>
      )}

      <Button
        variant="contained"
        size="large"
        onClick={() => void createSession()}
        disabled={isCreating}
        startIcon={isCreating ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {isCreating ? 'Creating session…' : 'Create Session & Connect'}
      </Button>

      <Typography variant="caption" color="text.secondary">
        Language: {language === 'de' ? '🇩🇪 Deutsch' : '🇬🇧 English'}
      </Typography>
    </Box>
  )
}

// ── Static preview version (no hooks, no server) ─────────────────────────────

const STATIC_MESSAGES: ChatMessageData[] = [
  { id: '1', role: 'user', content: 'Füge ein Pflichtfeld für den Vornamen hinzu.' },
  {
    id: '2',
    role: 'assistant',
    content:
      'Ich habe das Pflichtfeld „Vorname" (firstName, Typ: string) zum Formular hinzugefügt.',
  },
  { id: '3', role: 'user', content: 'Und eine E-Mail-Adresse?' },
  {
    id: '4',
    role: 'assistant',
    content:
      'Das Feld „E-Mail" (email, format: email, Pflichtfeld) wurde hinzugefügt. Die UI wurde mit dem Widget „email" konfiguriert.',
  },
  { id: '5', role: 'user', content: 'Mach das Dropdown für das Land.' },
]

const STATIC_CLARIFICATION: ClarificationPayload = {
  question: 'Meinen Sie ein einfaches Dropdown oder ein Autocomplete-Feld mit Suchfunktion?',
  options: ['Einfaches Dropdown (select)', 'Autocomplete mit Suche', 'Radio-Buttons'],
  context: 'Sie haben „Dropdown" erwähnt — dies kann unterschiedlich implementiert werden.',
}

const STATIC_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  title: 'Kontaktformular',
  properties: {
    firstName: { type: 'string', title: 'Vorname' },
    lastName: { type: 'string', title: 'Nachname' },
    email: { type: 'string', format: 'email', title: 'E-Mail' },
  },
  required: ['firstName', 'lastName', 'email'],
}

const STATIC_UI_SCHEMA: Record<string, unknown> = {
  email: { 'ui:widget': 'email' },
}

function SchemaDebuggerStatic() {
  return (
    <MarkdownChatProvider>
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: '#1e1e1e',
          borderRight: 1,
          borderColor: '#333',
        }}
      >
        <SchemaBlock label="JSON Schema  ·  v2" value={STATIC_JSON_SCHEMA} />
        <Divider sx={{ borderColor: '#333' }} />
        <SchemaBlock label="UI Schema" value={STATIC_UI_SCHEMA} />
      </Box>

      <Paper
        elevation={0}
        square
        sx={{
          width: 420,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderLeft: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            AI Assistent
          </Typography>
          <AgentStatusIndicator status="idle" />
        </Box>

        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChatMessageList messages={STATIC_MESSAGES} />
        </Box>

        <Divider />

        <Box sx={{ flexShrink: 0 }}>
          <ClarificationCard
            clarification={STATIC_CLARIFICATION}
            onAnswer={() => {}}
          />
        </Box>
      </Paper>
    </Box>
    </MarkdownChatProvider>
  )
}

// ── Storybook meta ────────────────────────────────────────────────────────────

interface LiveConnectStoryArgs {
  serverUrl: string
  language: 'de' | 'en'
}

const meta: Meta<LiveConnectStoryArgs> = {
  title: 'SchemaDebugger',
  component: LiveConnect,
}
export default meta
type Story = StoryObj<LiveConnectStoryArgs>

/** Connect to a running server and create a fresh session with one click. */
export const LiveServer: Story = {
  args: {
    serverUrl: 'http://localhost:3001',
    language: 'de',
  },
  parameters: { layout: 'fullscreen' },
}

/** Static snapshot — no server needed. Shows a clarification card in progress. */
export const StaticPreview: Story = {
  render: () => <SchemaDebuggerStatic />,
  parameters: { layout: 'fullscreen' },
}
