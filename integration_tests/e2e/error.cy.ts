import ErrorPage from '../pages/error'
import Page from '../pages/page'

context('Error', () => {
  beforeEach(() => {
    cy.task('reset')
    cy.task('stubSignIn')
    cy.task('stubManageUser')
    cy.task('stubGetPrisonerDetails')
    cy.task('stubGetUserDifferentCaseload')
    cy.task('stubComponents')
  })

  it('Must display mini profile on page', () => {
    cy.signIn({ failOnStatusCode: false })
    const errorPage = Page.verifyOnPage(ErrorPage)
    errorPage.miniProfile().should('exist')
  })

  it('Must display error page when prisoner is out', () => {
    cy.task('stubGetUserCaseload')
    cy.task('stubGetOutPrisonerDetails')
    cy.signIn({ failOnStatusCode: false })
    Page.verifyOnPage(ErrorPage)
  })
})
