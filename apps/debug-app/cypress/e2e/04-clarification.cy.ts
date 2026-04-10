describe('clarification (live LLM)', { retries: 2 }, () => {
  beforeEach(function () {
    const agent = (Cypress.env('agentServerUrl') as string) ?? 'http://127.0.0.1:3001'
    cy.request({ url: `${agent}/health`, failOnStatusCode: false }).then((res) => {
      if (res.status !== 200) {
        throw new Error(`Agent server not reachable at ${agent}/health — run bun run dev:server`)
      }
    })
  })

  it('may show clarification for an ambiguous request', () => {
    cy.visit('/')
    cy.openChat()
    cy.sendMessage(
      'Change something in the form. Do not assume which field — if unclear, ask using request_clarification.',
    )
    cy.waitForAgentIdle()
    // Clarification UI: free-text answer field and/or option chips
    cy.get('input[placeholder="Type your answer…"], textarea[placeholder="Type your answer…"]', {
      timeout: 120000,
    }).should('be.visible')
  })
})
