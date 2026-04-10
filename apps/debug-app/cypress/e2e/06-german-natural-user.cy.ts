/**
 * German session (`?lang=de`) with lay user wording — no tool names or schema jargon in the prompts.
 * Goal-oriented: registration-style fields, then an optional follow-up.
 */
describe('German session — natural user language (live LLM)', { retries: 2 }, () => {
  beforeEach(function () {
    const agent = (Cypress.env('agentServerUrl') as string) ?? 'http://127.0.0.1:3001'
    cy.request({ url: `${agent}/health`, failOnStatusCode: false }).then((res) => {
      if (res.status !== 200) {
        throw new Error(`Agent server not reachable at ${agent}/health — run bun run dev:server`)
      }
    })
  })

  it('understands non-technical German and reaches a clear form goal', () => {
    cy.visit('/?lang=de')
    cy.openChat()
    cy.get('[aria-label="Agent status: error"]').should('not.exist')

    cy.sendMessage(
      [
        'Hallo, ich bin mir noch nicht so sicher, wie das hier alles geht — wir brauchen für unsere kleine Anmeldung',
        'eigentlich nur zwei Sachen: dass Leute eintragen können, wie sie heißen,',
        'und außerdem ihre E-Mail-Adresse, falls wir uns melden müssen.',
        'Kannst du das so für mich einrichten?',
      ].join(' '),
    )

    cy.get('[data-testid="tool-log-body"]').contains('td', 'add_field', { timeout: 180000 })
    cy.get('[data-testid="json-schema-preview"]').should(($el) => {
      const t = $el.text().toLowerCase()
      expect(t).to.match(/email|e-mail|mail/)
      expect(t.length).to.be.greaterThan(20)
    })
    cy.get('textarea[placeholder="Type a message…"]', { timeout: 180000 }).should('not.be.disabled')

    cy.sendMessage(
      [
        'Super, danke dir.',
        'Wenn das geht: könntest du noch ein freiwilliges Feld für eine Telefonnummer ergänzen?',
        'Soll niemand zwingend ausfüllen — nur falls jemand lieber angerufen werden will.',
      ].join(' '),
    )

    cy.get('[data-testid="tool-log-body"]').contains('td', 'add_field', { timeout: 180000 })
    cy.get('[data-testid="json-schema-preview"]').should(($el) => {
      const t = $el.text().toLowerCase()
      expect(t).to.match(/phone|telefon|tel|handy|nummer|rufnummer/)
    })
    cy.get('[aria-label="Agent status: error"]').should('not.exist')
    cy.get('[data-testid^="tool-log-row"]').should('have.length.at.least', 2)
  })
})
