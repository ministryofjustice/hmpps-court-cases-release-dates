import { stubFor } from './wiremock'

const courtCase = (uuid: string) => ({
  prisonerId: 'A1234AB',
  courtCaseUuid: uuid,
  courtCaseStatus: 'ACTIVE',
  latestCourtAppearance: {
    appearanceUuid: `${uuid}-appearance`,
    courtCode: 'B10JQ',
    outcome: 'Imprisonment',
    warrantType: 'SENTENCING',
    charges: [
      {
        chargeUuid: `${uuid}-charge`,
        offenceCode: 'CJ88001',
        offenceStartDate: '2025-12-30',
        outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
        legacyData: { offenceDescription: 'Common assault' },
        createdAt: '2026-01-01T12:30:00',
      },
    ],
  },
  appearanceCount: 1,
  caseReferences: [],
  overallSentenceLength: null,
})

const stubSearchCourtCases = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPath: '/ras-api/court-case/paged/search',
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: {
        content: [courtCase('cc-1'), courtCase('cc-2')],
        prisonerCourtCaseTotal: 2,
      },
    },
  })

const stubGetConsecutiveToDetails = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPath: '/ras-api/sentence/consecutive-to-details',
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: { sentences: [] },
    },
  })

const stubGetAllRecalls = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPattern: '/ras-api/recall/person/A1234AB/search',
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: { recalls: [] },
    },
  })

const stubGetLatestImmigrationDetentionRecordByPrisoner = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPattern: '/ras-api/immigration-detention/person/A1234AB/latest',
    },
    response: {
      status: 404,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: {},
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
  stubGetLatestImmigrationDetentionRecordByPrisoner,
  stubRASApiPing: ping,
  stubSearchCourtCases,
  stubGetConsecutiveToDetails,
  stubGetAllRecalls,
}
