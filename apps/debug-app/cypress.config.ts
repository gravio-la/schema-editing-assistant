import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    // Use 127.0.0.1 (not "localhost"): Electron often resolves localhost → ::1 while Vite
    // may only listen on IPv4 — Cypress then shows "could not load" while normal Chrome works.
    baseUrl: 'http://127.0.0.1:5174',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: true,
    defaultCommandTimeout: 15000,
    retries: {
      runMode: 1,
      openMode: 0,
    },
    env: {
      agentServerUrl: 'http://127.0.0.1:3001',
    },
  },
})
