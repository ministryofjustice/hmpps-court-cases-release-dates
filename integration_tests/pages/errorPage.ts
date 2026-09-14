import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class ErrorPage extends AbstractPage {
  readonly miniProfile: Locator

  private constructor(page: Page) {
    super(page)
    this.miniProfile = page.getByTestId('mini-profile')
  }

  static async verifyOnPage(page: Page): Promise<ErrorPage> {
    const errorPage = new ErrorPage(page)
    await expect(page.getByRole('heading', { name: 'The details for this person cannot be found' })).toBeVisible()
    return errorPage
  }
}
