import { expect, test } from '@playwright/test'

import { attemptHmppsAuthLogin, resetStubs } from '../testUtils'
import hmppsAuth from '../mockApis/hmppsAuth'
import manageUsersApi from '../mockApis/manageUsersApi'
import tokenVerification from '../mockApis/tokenVerification'
import prisonApi from '../mockApis/prisonApi'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import components from '../mockApis/components'
import ErrorPage from '../pages/errorPage'

test.describe('Error', () => {
  test.beforeEach(async () => {
    await manageUsersApi.stubManageUser()
    await prisonApi.stubGetUserDifferentCaseload()
    await components.stubComponents()

    await hmppsAuth.favicon()
    await hmppsAuth.stubSignInPage()
    await hmppsAuth.stubSignOutPage()
    await hmppsAuth.token({})
    await tokenVerification.stubVerifyToken(true)
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('Must display mini profile on page', async ({ page }) => {
    await prisonerSearchApi.stubGetPrisonerDetails()

    await attemptHmppsAuthLogin(page, '/prisoner/A1234AB/overview')

    const errorPage = await ErrorPage.verifyOnPage(page)
    await expect(errorPage.miniProfile).toBeVisible()
  })

  test('Must display error page when prisoner is out', async ({ page }) => {
    await prisonApi.stubGetUserCaseload()
    await prisonerSearchApi.stubGetOutPrisonerDetails()

    await attemptHmppsAuthLogin(page, '/prisoner/A1234AB/overview')

    await ErrorPage.verifyOnPage(page)
  })
})
