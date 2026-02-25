import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const monorepoRoot = resolve(__dirname, '../..')
const pkgs = (name: string) => resolve(monorepoRoot, 'packages', name, 'src', 'index.ts')

// Packages installed in storybook's own node_modules (not hoisted to root).
// We alias them explicitly so Vite can find them regardless of where the
// importing source file lives in the monorepo.
const sbPkg = (name: string) => resolve(__dirname, 'node_modules', name)

export default defineConfig({
  resolve: {
    // Point workspace packages directly at their TS source — no build step needed.
    alias: {
      '@graviola/agent-chat-components': pkgs('agent-chat-components'),
      '@graviola/agent-chat-flow': pkgs('agent-chat-flow'),
      '@graviola/agent-chat-markdown': pkgs('agent-chat-markdown'),
      // Heavy renderer deps live in storybook's node_modules; alias so Vite
      // always resolves a single copy regardless of importer location.
      'mermaid': sbPkg('mermaid'),
      'prism-react-renderer': sbPkg('prism-react-renderer'),
      'mui-markdown': sbPkg('mui-markdown'),
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
