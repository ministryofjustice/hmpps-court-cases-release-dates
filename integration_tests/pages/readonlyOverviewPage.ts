import { expect, type Locator, type Page as Page2 } from '@playwright/test'
import AbstractPage from './abstractPage'
import OffenceCardSummaryList from './components/offenceCardSummaryList'

export default class ReadonlyOverviewPage extends AbstractPage {
  readonly toggleAllCourtCasesDetails: Locator

  readonly toggleAllCourtCasesSummary: Locator

  readonly courtCaseDetails: Locator

  readonly offenceCardSummary: OffenceCardSummaryList

  private constructor(page: Page2) {
    super(page)

    this.toggleAllCourtCasesDetails = page.locator('#toggle-all-court-cases-details')
    this.toggleAllCourtCasesSummary = page.locator('#toggle-all-court-cases-summary')
    this.courtCaseDetails = page
      .locator('.court-case-details-card__details')
      .filter({ hasNot: this.toggleAllCourtCasesDetails })
    this.offenceCardSummary = new OffenceCardSummaryList(page)
  }

  async clickAllCourtCasesSummaryLink() {
    await this.toggleAllCourtCasesSummary.click()
  }

  static async verifyOnPage(page: Page2): Promise<ReadonlyOverviewPage> {
    const readonlyOverviewPage = new ReadonlyOverviewPage(page)
    await expect(readonlyOverviewPage.toggleAllCourtCasesDetails).toBeVisible()
    return readonlyOverviewPage
  }
}
