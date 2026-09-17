import { stubFor } from './wiremock'

const courtCase = (
  uuid: string,
  charges = [
    {
      chargeUuid: `${uuid}-charge`,
      offenceCode: 'CJ88001',
      offenceStartDate: '2025-12-30',
      outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
      legacyData: { offenceDescription: 'Common assault' },
      createdAt: '2026-01-01T12:30:00',
    },
  ],
) => ({
  prisonerId: 'A1234AB',
  courtCaseUuid: uuid,
  courtCaseStatus: 'ACTIVE',
  latestCourtAppearance: {
    appearanceUuid: `${uuid}-appearance`,
    courtCode: 'B10JQ',
    outcome: 'Imprisonment',
    warrantType: 'SENTENCING',
    charges,
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

const stubSearchCourtCasesSingleCourtCaseMultipleCharges = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPath: '/ras-api/court-case/paged/search',
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: {
        content: [
          courtCase('cc-1', [
            {
              chargeUuid: `932AEAA0-49F4-441D-AAB0-7DC04C615947-charge`,
              offenceCode: 'CJ88001',
              offenceStartDate: '2025-12-30',
              outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
              legacyData: { offenceDescription: 'Common assault' },
              createdAt: '2026-01-01T12:30:00',
            },
            {
              chargeUuid: `30A52170-7839-4088-82BD-66D3C5A2FE89-charge`,
              offenceCode: 'CJ88001',
              offenceStartDate: '2025-12-30',
              outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
              legacyData: { offenceDescription: 'Common assault' },
              createdAt: '2026-01-01T12:31:00',
            },
            {
              chargeUuid: `13237927-6DD4-4649-B925-D9AE9AFDF8C1-charge`,
              offenceCode: 'CJ88001',
              offenceStartDate: '2025-12-30',
              outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
              legacyData: { offenceDescription: 'Common assault' },
              createdAt: '2026-01-01T12:32:00',
            },
            {
              chargeUuid: `2983662E-ED6F-4466-AED7-9E37A4CC425B-charge`,
              offenceCode: 'CJ88001',
              offenceStartDate: '2025-12-30',
              outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
              legacyData: { offenceDescription: 'Common assault' },
              createdAt: '2026-01-01T12:34:00',
            },
            {
              chargeUuid: `6C3DF3F2-EF49-4760-89C1-A9B3F88648E7-charge`,
              offenceCode: 'CJ88001',
              offenceStartDate: '2025-12-30',
              outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
              legacyData: { offenceDescription: 'Common assault' },
              createdAt: '2026-01-01T12:35:00',
            },
            {
              chargeUuid: `16D3564D-0CAA-48AE-BD2F-323D3E7A3509-charge`,
              offenceCode: 'CJ88001',
              offenceStartDate: '2025-12-30',
              outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
              legacyData: { offenceDescription: 'Common assault' },
              createdAt: '2026-01-01T12:36:00',
            },
            {
              chargeUuid: `E2F9F819-DCF0-4CE7-B703-0BA329E9C5D8-charge`,
              offenceCode: 'CJ88001',
              offenceStartDate: '2025-12-30',
              outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
              legacyData: { offenceDescription: 'Common assault' },
              createdAt: '2026-01-01T12:37:00',
            },
            {
              chargeUuid: `E55FEA39-8582-4D18-B824-5FAE0520DAA2-charge`,
              offenceCode: 'CJ88001',
              offenceStartDate: '2025-12-30',
              outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
              legacyData: { offenceDescription: 'Common assault' },
              createdAt: '2026-01-01T12:38:00',
            },
            {
              chargeUuid: `05DF6B1E-4414-4FF3-8C84-B9CE5859BBEE-charge`,
              offenceCode: 'CJ88001',
              offenceStartDate: '2025-12-30',
              outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
              legacyData: { offenceDescription: 'Common assault' },
              createdAt: '2026-01-01T12:39:00',
            },
            {
              chargeUuid: `B9C2E893-02C6-462F-B231-5591534B634F-charge`,
              offenceCode: 'CJ88001',
              offenceStartDate: '2025-12-30',
              outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
              legacyData: { offenceDescription: 'Common assault' },
              createdAt: '2026-01-01T12:40:00',
            },
          ]),
        ],
        prisonerCourtCaseTotal: 1,
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
  stubSearchCourtCasesSingleCourtCaseMultipleCharges,
  stubGetConsecutiveToDetails,
  stubGetAllRecalls,
}
