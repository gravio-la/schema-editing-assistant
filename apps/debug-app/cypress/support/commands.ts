/// <reference types="cypress" />

Cypress.Commands.add('openChat', () => {
  cy.get('[data-testid="open-assistant-fab"]').should('be.visible').click()
  cy.get('[data-testid="debug-session-id"]', { timeout: 60000 }).should('be.visible')
  cy.get('textarea[placeholder="Type a message…"]', { timeout: 60000 }).should('be.visible')
})

Cypress.Commands.add('sendMessage', (text: string) => {
  cy.get('textarea[placeholder="Type a message…"]').should('not.be.disabled').clear().type(`${text}{enter}`)
})

Cypress.Commands.add('waitForAgentIdle', () => {
  cy.get('[aria-label="Agent status: idle"]', { timeout: 180000 }).should('be.visible')
})

export {}

declare global {
  namespace Cypress {
    interface Chainable {
      openChat(): Chainable<void>
      sendMessage(text: string): Chainable<void>
      waitForAgentIdle(): Chainable<void>
    }
  }
}
