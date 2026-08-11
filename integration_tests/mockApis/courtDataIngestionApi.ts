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

export default {
  stubCourtDocuments,
  stubCourtRegister,
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
