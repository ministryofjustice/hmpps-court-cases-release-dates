import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubUnusedDeductionsCalculationResult: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: '/adjustments-api/adjustments/person/A1234AB/unused-deductions-result',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          status: 'CALCULATED',
        },
      },
    })
  },
  stubGetAdjustments: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: '/adjustments-api/adjustments',
        queryParameters: {
          person: {
            equalTo: 'A1234AB',
          },
          sentenceEnvelopeDate: {
            equalTo: '2001-01-01',
          },
        },
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: [
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            bookingId: 0,
            person: 'string',
            adjustmentType: 'REMAND',
            toDate: '2024-03-06',
            fromDate: '2024-03-06',
            days: 5,
            remand: {
              chargeId: [0],
            },
            additionalDaysAwarded: {
              adjudicationId: [0],
              prospective: true,
            },
            unlawfullyAtLarge: {
              type: 'RECALL',
            },
            taggedBail: {
              caseSequence: 0,
            },
            sentenceSequence: 0,
            adjustmentTypeText: 'string',
            adjustmentArithmeticType: 'DEDUCTION',
            prisonName: 'Leeds',
            prisonId: 'LDS',
            lastUpdatedBy: 'string',
            status: 'ACTIVE',
            lastUpdatedDate: '2024-03-06T15:53:46.483Z',
            createdDate: '2024-03-06T15:53:46.483Z',
          },
        ],
      },
    })
  },
  stubGetIntercept: (): SuperAgentRequest => {
    return stubFor({
      request: {
        method: 'GET',
        urlPath: '/adjustments-api/adjustments/additional-days/A1234AB/adjudication-details',
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          type: 'NONE',
          number: 0,
          anyProspective: true,
          messageArguments: ['string'],
          message: 'string',
        },
      },
    })
  },
}
