import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@graviola/agent-form-flow',
    '@graviola/agent-chat-components',
    'ajv',
    'ajv-formats',
  ],
})
