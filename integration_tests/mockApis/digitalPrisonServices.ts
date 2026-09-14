import type { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubDps: (): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPathPattern: '/dps.*',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
        body: '<html lang="en"><body><h1>Digital Prison Services</h1></body></html>',
      },
    }),
}
