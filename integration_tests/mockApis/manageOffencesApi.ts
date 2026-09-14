import { stubFor } from './wiremock'

const stubGetOffencesByCodes = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPath: '/manage-offences-api/offences/code/multiple',
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: [{ code: 'CJ88001', description: 'Common assault' }],
    },
  })

export default { stubGetOffencesByCodes }
