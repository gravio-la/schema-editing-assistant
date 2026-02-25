import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import mermaid from 'mermaid'

let initialized = false
function ensureInit() {
  if (!initialized) {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
    initialized = true
  }
}

let idCounter = 0

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useRef(`mermaid-${++idCounter}`)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureInit()
    let cancelled = false
    setSvg(null)
    setError(null)
    mermaid
      .render(id.current, chart.trim())
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err))
      })
    return () => {
      cancelled = true
    }
  }, [chart])

  if (error !== null) {
    return (
      <Box component="pre" sx={{ color: 'error.main', fontSize: 12, whiteSpace: 'pre-wrap', p: 1 }}>
        <Typography variant="caption" color="error">
          Mermaid error: {error}
        </Typography>
      </Box>
    )
  }

  if (svg === null) return null

  return (
    <Box
      dangerouslySetInnerHTML={{ __html: svg }}
      sx={{ '& svg': { maxWidth: '100%', height: 'auto' }, my: 1 }}
    />
  )
}
