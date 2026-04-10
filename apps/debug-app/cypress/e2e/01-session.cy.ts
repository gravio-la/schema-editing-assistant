describe('session', () => {
  beforeEach(function () {
    const agent = (Cypress.env('agentServerUrl') as string) ?? 'http://localhost:3001'
    cy.request({ url: `${agent}/health`, failOnStatusCode: false }).then((res) => {
      if (res.status !== 200) {
        throw new Error(`Agent server not reachable at ${agent}/health — run bun run dev:server`)
      }
    })
  })

  it('opens chat and shows a session id', () => {
    cy.visit('/')
    cy.get('[data-testid="debug-session-none"]').should('be.visible')
    cy.openChat()
    cy.get('[data-testid="debug-session-id"]')
      .should('be.visible')
      .invoke('text')
      .should('match', /^[0-9a-f-]{36}$/i)
  })
})
