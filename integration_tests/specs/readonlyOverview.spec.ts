import { expect, test } from '@playwright/test'
import { login, resetStubs } from '../testUtils'

import frontendComponentsApi from '../mockApis/frontEndComponentsApi'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import remandAndSentencingApi from '../mockApis/remandAndSentencingApi'
import courtRegisterApi from '../mockApis/courtRegisterApi'
import manageOffencesApi from '../mockApis/manageOffencesApi'
import prisonApi from '../mockApis/prisonApi'
import calculateReleaseDatesApi from '../mockApis/calculateReleaseDatesApi'

import manageUsersApi from '../mockApis/manageUsersApi'
import hmppsAuth from '../mockApis/hmppsAuth'
import adjustmentsApi from '../mockApis/adjustmentsApi'
import courtCasesReleaseDatesApi from '../mockApis/courtCasesReleaseDatesApi'
import ReadonlyOverviewPage from '../pages/readonlyOverviewPage'

test.beforeEach(async () => {
  await resetStubs()
  await frontendComponentsApi.stubComponents()
  await hmppsAuth.stubSignInPage()
  await manageUsersApi.stubManageUser()
  await prisonerSearchApi.stubGetPrisonerDetails()
  await prisonApi.stubGetNextCourtEvent()
  await prisonApi.stubGetActiveCaseCount()
  await adjustmentsApi.stubGetAdjustments()
  await adjustmentsApi.stubGetIntercept()
  await calculateReleaseDatesApi.stubGetLatestCalculation()
  await prisonApi.stubGetUserCaseload()
  await prisonApi.stubGetSentencesAndOffences()
  await courtCasesReleaseDatesApi.stubGetThingsToDo()
  await remandAndSentencingApi.stubGetLatestImmigrationDetentionRecordByPrisoner()
  await remandAndSentencingApi.stubGetAllRecalls()
  await remandAndSentencingApi.stubSearchCourtCases()
  await remandAndSentencingApi.stubGetConsecutiveToDetails()
  await courtRegisterApi.stubGetCourtMap()
  await manageOffencesApi.stubGetOffencesByCodes()
})

test('should toggle all court case details open and closed', async ({ page }) => {
  await login(page)

  await page.goto('/prisoner/A1234AB/readonly-overview')
  const overviewPage = await ReadonlyOverviewPage.verifyOnPage(page)

  await expect(overviewPage.toggleAllCourtCasesDetails).not.toHaveAttribute('open')
  let elements = await overviewPage.courtCaseDetails.all()
  await Promise.all(elements.map(el => expect(el).not.toHaveAttribute('open', '')))

  await overviewPage.clickAllCourtCasesSummaryLink()
  await expect(overviewPage.toggleAllCourtCasesDetails).toHaveAttribute('open')
  elements = await overviewPage.courtCaseDetails.all()
  await Promise.all(elements.map(el => expect(el).toHaveAttribute('open', '')))

  await overviewPage.clickAllCourtCasesSummaryLink()
  await expect(overviewPage.toggleAllCourtCasesDetails).not.toHaveAttribute('open')
  elements = await overviewPage.courtCaseDetails.all()
  await Promise.all(elements.map(el => expect(el).not.toHaveAttribute('open', '')))
})
