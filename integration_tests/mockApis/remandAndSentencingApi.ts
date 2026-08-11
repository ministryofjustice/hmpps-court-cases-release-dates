import { stubFor } from './wiremock'

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

const stubRaSDocuments = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPattern: '/ras-api/person/A1234AB/documents',
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: {
        courtCaseDocuments: [
          {
            courtCaseUuid: 'c6bbb5bb-1086-473f-8eff-1d25ee305750',
            appearanceDocumentsByType: {
              PRISON_COURT_REGISTER: [
                {
                  documentUUID: 'c43f547c-35e9-4c9a-b7dc-c166223056cb',
                  documentType: 'PRISON_COURT_REGISTER',
                  fileName: '[devpcr] Manchester City Magistrates Court, Taylor TINKER; yy-mm-dd; BC23456789B.pdf',
                  warrantDate: '2025-10-05',
                  caseReference: 'BC23456789B',
                  courtCode: 'LVRPCC',
                  warrantType: 'NON_SENTENCING',
                },
              ],
            },
          },
          {
            courtCaseUuid: '9916c639-b188-47fe-842f-451d1f598cab',
            appearanceDocumentsByType: {
              HMCTS_WARRANT: [
                {
                  documentUUID: '80dffad6-ec63-47e5-9d79-cb96537081e7',
                  documentType: 'HMCTS_WARRANT',
                  fileName: '[devwarrant] Manchester City Magistrates Court, Taylor TINKER; yy-mm-dd; AB12345678A .pdf',
                  warrantDate: '2025-11-04',
                  caseReference: 'AB12345678A',
                  courtCode: 'MNCHMC',
                  warrantType: 'SENTENCING',
                },
              ],
              PRISON_COURT_REGISTER: [
                {
                  documentUUID: '4fd5f7b0-eebf-4b69-9489-0cc48550e03b',
                  documentType: 'PRISON_COURT_REGISTER',
                  fileName: '[devpcr] Manchester City Magistrates Court, Taylor TINKER; yy-mm-dd; BC23456789B.pdf',
                  warrantDate: '2025-10-05',
                  caseReference: 'BC23456789B',
                  courtCode: 'LVRPCC',
                  warrantType: 'NON_SENTENCING',
                },
              ],
            },
          },
          {
            courtCaseUuid: '9916c639-b188-47fe-842f-451d1f598cab',
            appearanceDocumentsByType: {
              HMCTS_WARRANT: [
                {
                  documentUUID: '80dffad6-ec63-47e5-9d79-cb96537081e8',
                  documentType: 'HMCTS_WARRANT',
                  fileName: '[devwarrant] Manchester City Magistrates Court, Taylor TINKER; yy-mm-dd;  .pdf',
                  warrantDate: '2026-01-31',
                  caseReference: '',
                  courtCode: 'MNCHMC',
                  warrantType: 'SENTENCING',
                },
              ],
            },
          },
        ],
      },
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
  stubRaSDocuments,
  stubRASApiPing: ping,
}
