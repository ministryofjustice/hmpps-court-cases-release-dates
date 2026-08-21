import { stubFor } from './wiremock'

const stubCourtDocuments = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPathPattern: '/court-data-ingestion-api/court-document/person/A1234AB',
      queryParameters: {
        prisonDocumentIds: {
          equalTo:
            '4fd5f7b0-eebf-4b69-9489-0cc48550e03b,8980c409-465c-41a4-969d-affe0d9b9df7,bdee9909-ba50-48d6-ad80-e8ecf6ffa912,9612b032-383b-4a83-9765-30484182c7fa',
        },
      },
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: cpDocuments,
    },
  })

const stubCourtRegister = () =>
  stubFor({
    request: {
      method: 'GET',
      urlPathPattern: '/court-register-api/courts/id/multiple',
      queryParameters: {
        courtIds: {
          matches: 'LVRPCC|MNCHMC',
        },
      },
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: [
        {
          courtId: 'LVRPCC',
          courtName: 'Liverpool Crown Court',
        },
        {
          courtId: 'MNCHMC',
          courtName: 'Manchester Magistrates Court',
        },
      ],
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

export default {
  stubCourtDocuments,
  stubCourtRegister,
  stubRaSDocuments,
}

const cpDocuments = [
  {
    caseReferences: ['CommonPlatformCase123', 'CommonPlatformCase456'],
    prisonDocumentId: '4fd5f7b0-eebf-4b69-9489-0cc48550e03b',
    isUnread: true,
    documentType: 'PRISON_COURT_REGISTER',
    courtHearing: {
      courtName: 'Court 123',
      hearingType: 'Sentencing',
      hearingDate: '2024-01-01T12:34',
    },
  },
  {
    caseReferences: ['CommonPlatformCase123'],
    prisonDocumentId: '8980c409-465c-41a4-969d-affe0d9b9df7',
    isUnread: true,
    documentType: 'SENTENCING_WARRANT',
    courtHearing: {
      courtName: 'Court 345',
      hearingType: 'First hearing',
      hearingDate: '2026-01-01T12:34',
    },
  },
  {
    caseReferences: ['CommonPlatformCase123'],
    prisonDocumentId: 'bdee9909-ba50-48d6-ad80-e8ecf6ffa912',
    isUnread: false,
    documentType: 'COMMON_PLATFORM_DOCUMENT',
    courtHearing: {
      courtName: 'Court 678',
      hearingType: 'Remand',
      hearingDate: '2025-01-01T12:34',
    },
  },
]
