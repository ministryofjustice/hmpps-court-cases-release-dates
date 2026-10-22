import jwt from 'jsonwebtoken'
import { DataTelemetry, EnvelopeTelemetry } from 'applicationinsights/out/Declarations/Contracts'
import { addCustomDataToRequests, ContextObject, buildPermissionsTelemetryClient } from './azureAppInsights'

const userUuid = '11111111-2222-3333-4444-555555555555'
const token = jwt.sign({ user_uuid: userUuid }, 'secret')

const user = {
  username: 'test-user',
  user_uuid: userUuid,
}

const createEnvelope = (properties: Record<string, string | boolean>, baseType = 'RequestData') =>
  ({
    data: {
      baseType,
      baseData: { properties },
    } as DataTelemetry,
  }) as EnvelopeTelemetry

const createContext = (username: string, userToken?: string) =>
  ({
    'http.ServerRequest': {
      res: {
        locals: {
          user: {
            username,
            token: userToken,
          },
        },
      },
    },
  }) as ContextObject

const context = createContext(user.username, token)

describe('azureAppInsights', () => {
  describe('addUserDataToRequests', () => {
    it('adds user data to properties when present', () => {
      const envelope = createEnvelope({ other: 'things' })

      addCustomDataToRequests(envelope, context)

      expect(envelope.data.baseData.properties).toStrictEqual({
        ...user,
        other: 'things',
      })
    })

    it('handles absent user data', () => {
      const envelope = createEnvelope({})

      addCustomDataToRequests(envelope, context)

      expect(envelope.data.baseData.properties).toStrictEqual({
        ...user,
      })
    })

    it('returns true when not RequestData type', () => {
      const envelope = createEnvelope({}, 'NOT_REQUEST_DATA')

      const response = addCustomDataToRequests(envelope, context)

      expect(response).toStrictEqual(true)
    })

    it('handles when no properties have been set', () => {
      const envelope = createEnvelope(undefined)

      addCustomDataToRequests(envelope, context)

      expect(envelope.data.baseData.properties).toStrictEqual(user)
    })

    it('adds user_uuid from the token as well as username', () => {
      const envelope = createEnvelope({})

      addCustomDataToRequests(envelope, createContext('test-user', token))

      expect(envelope.data.baseData.properties).toStrictEqual({ username: 'test-user', user_uuid: userUuid })
    })

    it('omits user_uuid when token is missing or invalid', () => {
      const envelope = createEnvelope({})

      addCustomDataToRequests(envelope, createContext(user.username, 'not-a-jwt'))

      expect(envelope.data.baseData.properties).toStrictEqual({ username: user.username })
    })

    it('handles missing user details', () => {
      const envelope = createEnvelope({ other: 'things' })

      addCustomDataToRequests(envelope, {
        'http.ServerRequest': {},
      } as ContextObject)

      expect(envelope.data.baseData.properties).toEqual({
        other: 'things',
      })
    })
  })

  describe('buildPermissionsTelemetryClient', () => {
    it('returns undefined when no App Insights client is provided', () => {
      expect(buildPermissionsTelemetryClient(null)).toBeUndefined()
    })

    it('Should wrap the trackEvent to the PermissionsTelemetryClient', () => {
      const trackEvent = jest.fn()
      const wrapper = buildPermissionsTelemetryClient({ trackEvent } as never)

      wrapper.trackEvent('prisoner-permission-denied', { username: user.username, status: 'DENIED' })

      expect(trackEvent).toHaveBeenCalledWith({
        name: 'prisoner-permission-denied',
        properties: { username: user.username, status: 'DENIED' },
      })
    })
  })
})
