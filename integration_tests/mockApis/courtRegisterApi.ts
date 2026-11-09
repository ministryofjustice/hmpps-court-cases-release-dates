import { stubFor } from './wiremock'

const stubGetCourtMap = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPath: '/court-register-api/courts/id/multiple',
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: [{ courtId: 'B12345', courtName: 'Birmingham Magistrates Court' }],
    },
  })

const stubGetCourtByCode = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPath: '/court-register-api/courts/id/ALD',
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: [{ courtId: 'ALD', courtName: 'Aldershot' }],
    },
  })

export default { stubGetCourtMap, stubGetCourtByCode }
