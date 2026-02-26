import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // All peer deps must be external so the consumer's single installed copy is used.
  // MUI and Emotion MUST be external — bundling them causes duplicate module instances
  // and version-mismatch errors (e.g. theme.alpha is not a function when the consumer
  // runs a different MUI major than the version nested inside this package).
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@mui/material',
    '@mui/icons-material',
    '@mui/system',
    '@mui/utils',
    '@emotion/react',
    '@emotion/styled',
    '@emotion/cache',
  ],
})
