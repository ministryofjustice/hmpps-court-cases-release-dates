import { PageElement } from '../pages/page'

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

  describe('Documents tab page loads after search is done', () => {
    it('It renders properly all 3 types of possible documents: new CDIA, viewed CDIA, RAS', () => {
      cy.visit('/prisoner/A1234AB/documents')

      const searchResults = getSearchResults()
      searchResults.should('not.contain', 'No documents have been received')

      const listHeader: PageElement = searchResults.get('[data-qa=documents-sort-bar]')
      listHeader.should('contain', 'Sort by:')
      listHeader.should('contain', 'Showing')

      const newDocument = getDocument(searchResults, '4fd5f7b0-eebf-4b69-9489-0cc48550e03b')
      newDocument.should('contain', 'New')
      newDocument.should('contain', 'Case reference')

      const viewedDocument = getDocument(searchResults, 'bdee9909-ba50-48d6-ad80-e8ecf6ffa912')
      viewedDocument.should('not.contain', 'New')
      viewedDocument.should('contain', 'Mark as new')
      viewedDocument.should('contain', 'Case reference')

      const rasDocument = getDocument(searchResults, '80dffad6-ec63-47e5-9d79-cb96537081e8')
      rasDocument.should('not.contain', 'New')
      rasDocument.should('not.contain', 'Mark as new')
      rasDocument.should('contain', 'Case reference')
    })
  })

  let getSearchResults = (): PageElement => cy.get('#document-search-results')

  let getDocument = (searchResults: PageElement, documentUuid: string): PageElement =>
    searchResults.get(`[data-qa=document-${documentUuid}]`)
})
