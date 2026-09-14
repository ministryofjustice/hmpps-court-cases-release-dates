import { expect, type Page } from '@playwright/test'

export default class AuthManageDetailsPage {
  private constructor(readonly page: Page) {}

  static async verifyOnPage(page: Page): Promise<AuthManageDetailsPage> {
    const authManageDetailsPage = new AuthManageDetailsPage(page)
    await expect(page.getByRole('heading', { name: 'Your account details' })).toBeVisible()
    return authManageDetailsPage
  }
}
