import { expect, test } from '@playwright/test'

import { resetStubs } from '../testUtils'
import hmppsAuth from '../mockApis/hmppsAuth'
import manageUsersApi from '../mockApis/manageUsersApi'
import tokenVerification from '../mockApis/tokenVerification'
import components from '../mockApis/components'

test.describe('Healthcheck', () => {
  test.afterEach(async () => {
    await resetStubs()
  })

  test.describe('All healthy', () => {
    test.beforeEach(async () => {
      await hmppsAuth.stubPing()
      await manageUsersApi.stubManageUsersPing()
      await tokenVerification.stubTokenVerificationPing()
      await components.stubComponents()
    })

    test('Health check page is visible and UP', async ({ request }) => {
      const response = await request.get('/health')
      const body = await response.json()
      expect(body.status).toBe('UP')
    })

    test('Ping is visible and UP', async ({ request }) => {
      const response = await request.get('/ping')
      const body = await response.json()
      expect(body.status).toBe('UP')
    })

    test('Info is visible', async ({ request }) => {
      const response = await request.get('/info')
      const body = await response.json()
      expect(body).toBeTruthy()
    })
  })

  test.describe('Some unhealthy', () => {
    test.beforeEach(async () => {
      await hmppsAuth.stubPing()
      await manageUsersApi.stubManageUsersPing()
      await tokenVerification.stubTokenVerificationPing(500)
    })

    test('Reports correctly when token verification down', async ({ request }) => {
      const response = await request.get('/health')
      const body = await response.json()
      expect(body.components.hmppsAuth.status).toBe('UP')
      expect(body.components.manageUsersApi.status).toBe('UP')
      expect(body.components.tokenVerification.status).toBe('DOWN')
      expect(body.components.tokenVerification.details).toMatchObject({ status: 500, retries: 2 })
    })

    test('Health check page is visible and DOWN', async ({ request }) => {
      const response = await request.get('/health')
      const body = await response.json()
      expect(body.status).toBe('DOWN')
    })
  })
})
