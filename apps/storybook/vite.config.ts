import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const monorepoRoot = resolve(__dirname, '../..')
const pkgs = (name: string) => resolve(monorepoRoot, 'packages', name, 'src', 'index.ts')

export default defineConfig({
  resolve: {
    // Point workspace packages directly at their TS source — no build step needed.
    alias: {
      '@formsw/agent-chat-components': pkgs('agent-chat-components'),
      '@formsw/agent-chat-flow': pkgs('agent-chat-flow'),
    },
    dedupe: [
      'react',
      'react-dom',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
    ],
  },
  server: {
    fs: {
      // Allow serving files from the monorepo root (packages live outside apps/storybook).
      allow: [monorepoRoot],
    },
  },
})
