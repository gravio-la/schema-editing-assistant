describe('tool calls (live LLM)', { retries: 2 }, () => {
  beforeEach(function () {
    const agent = (Cypress.env('agentServerUrl') as string) ?? 'http://127.0.0.1:3001'
    cy.request({ url: `${agent}/health`, failOnStatusCode: false }).then((res) => {
      if (res.status !== 200) {
        throw new Error(`Agent server not reachable at ${agent}/health — run bun run dev:server`)
      }
    })
  })

  it('logs add_field in the debug tool table', () => {
    cy.visit('/')
    cy.openChat()
    cy.sendMessage(
      'Add exactly one required string field named fullName for the user full name. Call add_field once with that name.',
    )
    cy.waitForAgentIdle()
    cy.get('[data-testid="tool-log-body"]').contains('td', 'add_field', { timeout: 120000 })
    cy.get('[data-testid="json-schema-preview"]').should('contain', 'fullName')
  })
})
