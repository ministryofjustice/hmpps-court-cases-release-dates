/* eslint-disable import/first */
/*
 * Do appinsights first as it does some magic instrumentation work, i.e. it affects other 'require's
 * In particular, applicationinsights automatically collects bunyan logs
 */
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import type { TelemetryClient } from 'applicationinsights'
import type { TelemetryClient as PermissionsTelemetryClient } from '@ministryofjustice/hmpps-prison-permissions-lib'
import {
  initialiseAppInsights,
  buildAppInsightsClient,
  buildPermissionsTelemetryClient,
} from '../utils/azureAppInsights'
import applicationInfoSupplier from '../applicationInfo'

const applicationInfo = applicationInfoSupplier()
initialiseAppInsights()
const telemetryClient: TelemetryClient = buildAppInsightsClient(applicationInfo)
export const telemetryClientPermissionsLibWrapper: PermissionsTelemetryClient =
  buildPermissionsTelemetryClient(telemetryClient)

import HmppsAuthClient from './hmppsAuthClient'
import ManageUsersApiClient from './manageUsersApiClient'
import { createRedisClient } from './redisClient'
import RedisTokenStore from './tokenStore/redisTokenStore'
import InMemoryTokenStore from './tokenStore/inMemoryTokenStore'
import config from '../config'
import FeComponentsClient from './feComponentsClient'
import logger from '../../logger'

type RestClientBuilder<T> = (token: string) => T

export const dataAccess = () => ({
  applicationInfo,
  hmppsAuthClient: new HmppsAuthClient(
    config.redis.enabled ? new RedisTokenStore(createRedisClient()) : new InMemoryTokenStore(),
  ),
  hmppsAuthenticationClient: new AuthenticationClient(
    config.apis.hmppsAuth,
    logger,
    config.redis.enabled ? new RedisTokenStore(createRedisClient()) : new InMemoryTokenStore(),
  ),
  manageUsersApiClient: new ManageUsersApiClient(),
  feComponentsClient: new FeComponentsClient(),
})

export type DataAccess = ReturnType<typeof dataAccess>

export { HmppsAuthClient, ManageUsersApiClient }
export type { RestClientBuilder }
