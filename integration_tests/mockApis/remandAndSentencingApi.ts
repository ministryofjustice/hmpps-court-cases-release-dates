import { stubFor } from './wiremock'

const stubGetImmigrationDetentionByPrisoner = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPattern: '/ras-api/immigration-detention/person/A1234AB',
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: [],
    },
  })

const ping = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPattern: '/ras-api/health/ping',
    },
    response: {
      status: 200,
    },
  })

export default {
  stubGetImmigrationDetentionByPrisoner,
  stubRASApiPing: ping,
}
