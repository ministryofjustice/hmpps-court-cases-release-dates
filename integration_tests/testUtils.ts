import { Page } from '@playwright/test'
import { resetStubs } from './mockApis/wiremock'
import hmppsAuth, { UserToken } from './mockApis/hmppsAuth'
import tokenVerification from './mockApis/tokenVerification'
import prisonApi from './mockApis/prisonApi'
import digitalPrisonServices from './mockApis/digitalPrisonServices'

export { resetStubs }

const DEFAULT_ROLES = ['ROLE_RELEASE_DATES_CALCULATOR']

export const attemptHmppsAuthLogin = async (page: Page, returnToPath = '/') => {
  await digitalPrisonServices.stubDps()
  await page.goto(returnToPath)
  page.locator('h1', { hasText: 'Sign in' })
  const url = await hmppsAuth.getSignInUrl()
  return page.goto(url)
}

export const login = async (
  page: Page,
  { name, roles = DEFAULT_ROLES, active = true, authSource = 'nomis' }: UserToken & { active?: boolean } = {},
) => {
  await Promise.all([
    hmppsAuth.favicon(),
    hmppsAuth.stubSignInPage(),
    hmppsAuth.stubSignOutPage(),
    hmppsAuth.token({ name, roles, authSource }),
    tokenVerification.stubVerifyToken(active),
    prisonApi.stubGetUserCaseload(),
  ])
  return attemptHmppsAuthLogin(page)
}
