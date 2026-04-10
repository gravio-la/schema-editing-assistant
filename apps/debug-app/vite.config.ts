import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { clientConsoleToTerminal } from './vite-plugin-client-console'

const __filename = fileURLToPath(import.meta.url)
const require = createRequire(__filename)

/** Resolve a single physical copy — avoids "Invalid hook call" from duplicate React in the bundle. */
function pkgDir(name: string): string {
  return path.dirname(require.resolve(`${name}/package.json`))
}

const reactRoot = pkgDir('react')
const reactDomRoot = pkgDir('react-dom')

export default defineConfig({
  plugins: [clientConsoleToTerminal(), react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: reactRoot,
      'react-dom': reactDomRoot,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@ai-sdk/react', '@emotion/react', '@emotion/styled'],
  },
  server: {
    // Listen on all local interfaces so both IPv4 (127.0.0.1) and IPv6 (::1) work;
    // Cypress/Electron + `baseUrl` using 127.0.0.1 then matches reliably.
    host: true,
    port: 5174,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'BUN_PUBLIC_'],
})
