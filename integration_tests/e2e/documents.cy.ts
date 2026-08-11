context('Downloading/Viewing a document from Documents tab', () => {
  beforeEach(() => {
    cy.task('reset')
    cy.task('stubSignIn')
    cy.task('stubManageUser')
    cy.task('stubGetUserCaseload')
    cy.task('stubGetPrisonerDetails')
    cy.task('stubGetNextCourtEvent')
    cy.task('stubGetActiveCaseCount')
    cy.task('stubGetAdjustments')
    cy.task('stubGetLatestCalculation')
    cy.task('stubGetUserCaseload')
    cy.task('stubGetSentencesAndOffences')
    cy.task('stubGetThingsToDo')
    cy.task('stubComponents')
    cy.task('stubDocumentsFacetSearch')
    cy.task('stubRaSDocuments')
    cy.task('stubCourtDocuments')
    cy.task('stubCourtRegister')

    sessionStorage.clear()
    cy.signIn()
    cy.task('stubVerifyToken', true)
  })

  describe('Documents refresh after downloading a NEW document', () => {
    it('sets refresh-pending key when clicking a NEW document download link', () => {
      cy.visit('/prisoner/A1234AB/documents')

      cy.get('#document-search-results .document--new a[href*="/documents/"][href*="/download/"]')
        .first()
        .then($link => {
          // Avoid real navigation in test
          $link[0].addEventListener('click', e => e.preventDefault(), { once: true })
        })
        .click()

      cy.window().then(win => {
        expect(win.sessionStorage.getItem('ccrd:documents:refresh-pending')).to.eq('1')
      })
    })
  })

  describe('Documents do not refresh after downloading an already VIEWED document', () => {
    it('does not set refresh-pending key when clicking a non-new document link', () => {
      cy.visit('/prisoner/A1234AB/documents')

      cy.get(
        '#document-search-results .document:not(.document--new) a.prisoner-doc-link[href*="/documents/"][href*="/download/"]',
      )
        .first()
        .then($link => {
          // Avoid real navigation in test
          $link[0].addEventListener('click', e => e.preventDefault(), { once: true })
        })
        .click()

      cy.window().then(win => {
        expect(win.sessionStorage.getItem('ccrd:documents:refresh-pending')).to.eq(null)
      })
    })
  })
})
