describe('basic chat', () => {
  beforeEach(function () {
    const agent = (Cypress.env('agentServerUrl') as string) ?? 'http://localhost:3001'
    cy.request({ url: `${agent}/health`, failOnStatusCode: false }).then((res) => {
      if (res.status !== 200) {
        throw new Error(`Agent server not reachable at ${agent}/health — run bun run dev:server`)
      }
    })
  })

  it('sends a message and returns to idle without error', () => {
    cy.visit('/')
    cy.openChat()
    cy.sendMessage('Say only: pong')
    cy.waitForAgentIdle()
    cy.get('[aria-label="Agent status: error"]').should('not.exist')
  })
})
