import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // All peer deps must be external so consumers use their own single installed copy.
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@graviola/agent-chat-components',
    '@mui/material',
    '@mui/icons-material',
    '@mui/system',
    '@mui/utils',
    '@emotion/react',
    '@emotion/styled',
    '@emotion/cache',
  ],
})
