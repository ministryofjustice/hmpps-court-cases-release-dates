import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubGetNextCourtEvent: (): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/prison-api/api/court/1234/next-court-event',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          eventId: 0,
          startTime: '2021-07-05T10:35:17',
          courtLocation: 'Aldershot',
          courtEventType: 'Sentencing',
          caseReference: 'A1473295B',
        },
      },
    }),
  stubGetActiveCaseCount: (): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/prison-api/api/court/1234/count-active-cases',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: 1,
      },
    }),

  stubGetUserCaseload: (): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/prison-api/api/users/me/caseLoads',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [
          {
            caseLoadId: 'MDI',
          },
          {
            caseLoadId: 'OUT',
          },
        ],
      },
    }),

  stubGetUserDifferentCaseload: (): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/prison-api/api/users/me/caseLoads',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [
          {
            caseLoadId: 'OTHER',
          },
        ],
      },
    }),

  stubGetSentencesAndOffences: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: '/prison-api/api/offender-sentences/booking/1234/sentences-and-offences',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [
          {
            terms: [
              {
                years: 3,
              },
            ],
            sentenceCalculationType: 'ADIMP',
            sentenceTypeDescription: 'SDS Standard Sentence',
            caseSequence: 1,
            lineSequence: 1,
            caseReference: 'ABC123',
            sentenceSequence: 1,
            sentenceStatus: 'A',
            sentenceDate: '2001-01-01',
            courtDescription: 'Whiterun Hall of Justice',
            offences: [
              {
                offenceEndDate: '2000-02-03',
                offenceCode: 'abc',
                offenderChargeId: 111,
                offenceDescription: 'Doing a crime',
              },
            ],
          },
          {
            terms: [
              {
                years: 3,
              },
            ],
            sentenceCalculationType: 'ADIMP',
            sentenceTypeDescription: 'SDS Standard Sentence',
            caseSequence: 2,
            lineSequence: 2,
            caseReference: 'ABC123',
            sentenceSequence: 2,
            sentenceStatus: 'A',
            sentenceDate: '2001-02-01',
            courtDescription: 'Whiterun Hall of Justice',
            offences: [
              {
                offenceEndDate: '2000-02-03',
                offenceCode: 'abc',
                offenderChargeId: 111,
                offenceDescription: 'Doing a crime',
              },
            ],
          },
        ],
      },
    })
  },
}
