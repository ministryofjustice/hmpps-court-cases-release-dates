import { expect, test } from '@playwright/test'

import { login, resetStubs } from '../testUtils'
import hmppsAuth from '../mockApis/hmppsAuth'
import manageUsersApi from '../mockApis/manageUsersApi'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import prisonApi from '../mockApis/prisonApi'
import adjustmentsApi from '../mockApis/adjustmentsApi'
import calculateReleaseDatesApi from '../mockApis/calculateReleaseDatesApi'
import courtCasesReleaseDatesApi from '../mockApis/courtCasesReleaseDatesApi'
import remandAndSentencingApi from '../mockApis/remandAndSentencingApi'
import tokenVerification from '../mockApis/tokenVerification'
import components from '../mockApis/components'
import OverviewPage from '../pages/overviewPage'
import AuthManageDetailsPage from '../pages/authManageDetailsPage'

test.describe('SignIn', () => {
  test.afterEach(async () => {
    await resetStubs()
  })

  test('Unauthenticated user directed to auth', async ({ page }) => {
    await hmppsAuth.stubSignInPage()
    await page.goto('/')

    await expect(page.getByRole('heading')).toHaveText('Sign in')
  })

  test('Unauthenticated user navigating to sign in page directed to auth', async ({ page }) => {
    await hmppsAuth.stubSignInPage()
    await page.goto('/sign-in')

    await expect(page.getByRole('heading')).toHaveText('Sign in')
  })

  test('Token verification failure takes user to sign in page', async ({ page }) => {
    await login(page, { active: false })

    await expect(page.getByRole('heading')).toHaveText('Sign in')
  })

  test.describe('once signed in', () => {
    test.beforeEach(async () => {
      await manageUsersApi.stubManageUser()
      await prisonerSearchApi.stubGetPrisonerDetails()
      await prisonApi.stubGetNextCourtEvent()
      await prisonApi.stubGetActiveCaseCount()
      await adjustmentsApi.stubGetAdjustments()
      await adjustmentsApi.stubGetIntercept()
      await calculateReleaseDatesApi.stubGetLatestCalculation()
      await prisonApi.stubGetSentencesAndOffences()
      await courtCasesReleaseDatesApi.stubGetThingsToDo()
      await remandAndSentencingApi.stubGetLatestImmigrationDetentionRecordByPrisoner()
      await components.stubComponentsFail()
    })

    test('User name visible in header', async ({ page }) => {
      await login(page)
      await page.goto('/prisoner/A1234AB/overview')
      const overviewPage = await OverviewPage.verifyOnPage(page)

      await expect(overviewPage.usersName).toContainText('J. Smith')
    })

    test('Phase banner visible in header', async ({ page }) => {
      await login(page)
      await page.goto('/prisoner/A1234AB/overview')
      const overviewPage = await OverviewPage.verifyOnPage(page)

      await expect(overviewPage.phaseBanner).toContainText('dev')
    })

    test('User can sign out', async ({ page }) => {
      await login(page)
      await page.goto('/prisoner/A1234AB/overview')
      const overviewPage = await OverviewPage.verifyOnPage(page)

      await overviewPage.signOut()
      await expect(page.getByRole('heading')).toHaveText('Sign in')
    })

    test('User can manage their details', async ({ page }) => {
      await login(page)
      await hmppsAuth.stubManageDetailsPage()
      await page.goto('/prisoner/A1234AB/overview')
      const overviewPage = await OverviewPage.verifyOnPage(page)

      const [manageDetailsPage] = await Promise.all([page.waitForEvent('popup'), overviewPage.clickManageUserDetails()])
      await AuthManageDetailsPage.verifyOnPage(manageDetailsPage)
    })

    test('Token verification failure clears user session', async ({ page }) => {
      await login(page)
      await page.goto('/prisoner/A1234AB/overview')
      await OverviewPage.verifyOnPage(page)

      await tokenVerification.stubVerifyToken(false)
      await page.reload()
      await expect(page.getByRole('heading')).toHaveText('Sign in')

      await tokenVerification.stubVerifyToken(true)
      await manageUsersApi.stubManageUser('bobby brown')
      await login(page)
      await page.goto('/prisoner/A1234AB/overview')
      const overviewPage = await OverviewPage.verifyOnPage(page)

      await expect(overviewPage.usersName).toContainText('B. Brown')
    })
  })
})
