Cypress.Commands.add('signIn', (options = { failOnStatusCode: true }) => {
  cy.request('/prisoner/A1234AB/overview')
  return cy.task('getSignInUrl').then(url => cy.visit(url as string, options))
})
