import { expect, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class OverviewPage extends AbstractPage {
  private constructor(page: Page) {
    super(page)
  }

  static async verifyOnPage(page: Page): Promise<OverviewPage> {
    const overviewPage = new OverviewPage(page)
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
    return overviewPage
  }
}
