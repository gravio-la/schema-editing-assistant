describe('advanced prompting (live LLM)', { retries: 2 }, () => {
  beforeEach(function () {
    const agent = (Cypress.env('agentServerUrl') as string) ?? 'http://127.0.0.1:3001'
    cy.request({ url: `${agent}/health`, failOnStatusCode: false }).then((res) => {
      if (res.status !== 200) {
        throw new Error(`Agent server not reachable at ${agent}/health — run bun run dev:server`)
      }
    })
  })

  it('multi-turn: fields, group layout, move control, update schema', () => {
    cy.visit('/')
    cy.openChat()
    cy.get('[aria-label="Agent status: error"]').should('not.exist')

    // Turn 1 — two add_field calls (model may batch in one or two steps; mock logs each call)
    cy.sendMessage(
      [
        'Turn 1 only. Add two root-level fields using add_field (one call per field):',
        '(1) required string field firstName for the given name.',
        '(2) integer field age for age.',
        'Do not add layouts or groups in this turn.',
      ].join(' '),
    )
    cy.get('[data-testid="tool-log-body"]').contains('td', 'add_field', { timeout: 180000 })
    cy.get('[data-testid="json-schema-preview"]').should('contain', 'firstName')
    cy.get('[data-testid="json-schema-preview"]').should('contain', 'age')
    cy.get('textarea[placeholder="Type a message…"]', { timeout: 180000 }).should('not.be.disabled')

    // Turn 2 — layout + move (exercises add_layout + move_element in the mock executor)
    cy.sendMessage(
      [
        'Turn 2. First call add_layout once: a Group (or VerticalLayout group) with label exactly Person and empty elements.',
        'Then call move_element for scope #/properties/firstName with targetParentLabel Person so the name control sits inside that group.',
      ].join(' '),
    )
    cy.get('[data-testid="tool-log-body"]').contains('td', 'add_layout', { timeout: 180000 })
    cy.get('[data-testid="tool-log-body"]').contains('td', 'move_element', { timeout: 180000 })
    cy.get('[data-testid="ui-schema-preview"]').should('contain', 'Person')
    cy.get('textarea[placeholder="Type a message…"]', { timeout: 180000 }).should('not.be.disabled')

    // Turn 3 — update_field on existing property
    cy.sendMessage(
      [
        'Turn 3 only. Call update_field for scope #/properties/age',
        'with a schema patch that sets title to "Age in years" (JSON Schema title on that property).',
      ].join(' '),
    )
    cy.get('[data-testid="tool-log-body"]').contains('td', 'update_field', { timeout: 180000 })
    cy.get('[data-testid="json-schema-preview"]').should('contain', 'Age in years')
    cy.get('[aria-label="Agent status: error"]').should('not.exist')

    // Several tool rows accumulated across turns
    cy.get('[data-testid^="tool-log-row"]').should('have.length.at.least', 4)
  })
})
