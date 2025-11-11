import OverviewPage from '../pages/overview'
import AuthSignInPage from '../pages/authSignIn'
import Page from '../pages/page'
import AuthManageDetailsPage from '../pages/authManageDetails'

context('Sign In', () => {
  beforeEach(() => {
    cy.task('reset')
    cy.task('stubSignIn')
    cy.task('stubManageUser')
    cy.task('stubGetPrisonerDetails')
    cy.task('stubGetNextCourtEvent')
    cy.task('stubGetActiveCaseCount')
    cy.task('stubGetAdjustments')
    cy.task('stubGetIntercept')
    cy.task('stubGetLatestCalculation')
    cy.task('stubGetUserCaseload')
    cy.task('stubGetSentencesAndOffences')
    cy.task('stubGetThingsToDo')
    cy.task('stubGetImmigrationDetentionByPrisoner')
  })

  it('Unauthenticated user directed to auth', () => {
    cy.visit('/')
    Page.verifyOnPage(AuthSignInPage)
  })

  it('Unauthenticated user navigating to sign in page directed to auth', () => {
    cy.visit('/sign-in')
    Page.verifyOnPage(AuthSignInPage)
  })

  it('User name visible in header', () => {
    cy.signIn()
    const overviewPage = Page.verifyOnPage(OverviewPage)
    overviewPage.headerUserName().should('contain.text', 'J. Smith')
  })

  it('Phase banner visible in header', () => {
    cy.signIn()
    const overviewPage = Page.verifyOnPage(OverviewPage)
    overviewPage.headerPhaseBanner().should('contain.text', 'dev')
  })

  it('User can sign out', () => {
    cy.signIn()
    const overviewPage = Page.verifyOnPage(OverviewPage)
    overviewPage.signOut().click()
    Page.verifyOnPage(AuthSignInPage)
  })

  it('User can manage their details', () => {
    cy.signIn()
    cy.task('stubAuthManageDetails')
    const overviewPage = Page.verifyOnPage(OverviewPage)

    overviewPage.manageDetails().get('a').invoke('removeAttr', 'target')
    overviewPage.manageDetails().click()
    Page.verifyOnPage(AuthManageDetailsPage)
  })

  it('Token verification failure takes user to sign in page', () => {
    cy.signIn()
    Page.verifyOnPage(OverviewPage)
    cy.task('stubVerifyToken', false)

    // can't do a visit here as cypress requires only one domain
    cy.request('/prisoner/A1234AB/overview').its('body').should('contain', 'Sign in')
  })

  it('Token verification failure clears user session', () => {
    cy.signIn()
    const overviewPage = Page.verifyOnPage(OverviewPage)
    cy.task('stubVerifyToken', false)

    // can't do a visit here as cypress requires only one domain
    cy.request('/prisoner/A1234AB/overview').its('body').should('contain', 'Sign in')

    cy.task('stubVerifyToken', true)
    cy.task('stubManageUser', 'bobby brown')
    cy.signIn()

    overviewPage.headerUserName().contains('B. Brown')
  })
})
