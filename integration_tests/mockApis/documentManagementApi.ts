import { stubFor } from './wiremock'
import { FacetResult, FacetValue } from '../../server/@types/documentManagementApi/types'

const stubDocumentsFacetSearch = () =>
  stubFor({
    request: {
      method: 'POST',
      urlPattern: '/document-api/documents/facet/search',
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: documents,
    },
  })

export default {
  stubDocumentsFacetSearch,
}

const facets = {
  isUnread: {
    values: [
      { value: 'true', count: 1 } as FacetValue,
      { value: null, count: 5 } as unknown as FacetValue,
      { value: 'false', count: 1 } as FacetValue,
    ],
  } as FacetResult,
  caseReferences: {
    values: [
      { value: 'AB12345678A', count: 1 } as FacetValue,
      { value: 'BC23456789B', count: 2 } as FacetValue,
      { value: 'CommonPlatformCase123', count: 1 } as FacetValue,
      { value: 'CommonPlatformCase456', count: 1 } as FacetValue,
    ],
  } as FacetResult,
}

const documents = {
  request: {},
  results: [
    {
      documentUuid: '4fd5f7b0-eebf-4b69-9489-0cc48550e03b',
      documentType: 'PRISON_COURT_REGISTER',
      documentFilename: 'CommonPlatformfile.pdf',
      filename: 'CommonPlatformfile',
      fileExtension: 'pdf',
      fileSize: 2233,
      fileHash: '',
      mimeType: 'application/pdf',
      createdTime: '2026-03-27T14:22:30',
      createdByServiceName: 'Remand and Sentencing',
      createdByUsername: 'REMAND_SENTENCING_TEST_USER',
      metadata: {
        source: 'court-data-ingestion-api',
        prisonerId: 'A12345B',
        caseReferences: ['CommonPlatformCase123', 'CommonPlatformCase456'],
        isUnread: true,
      },
    },
    {
      documentUuid: 'c43f547c-35e9-4c9a-b7dc-c166223056cb',
      documentType: 'PRISON_COURT_REGISTER',
      documentFilename: '[devpcr] Manchester City Magistrates Court, Taylor TINKER; yy-mm-dd; BC23456789B.pdf',
      filename: '[devpcr] Manchester City Magistrates Court, Taylor TINKER; yy-mm-dd; BC23456789B',
      fileExtension: 'pdf',
      fileSize: 125215125,
      fileHash: '',
      mimeType: 'application/pdf',
      createdTime: '2026-03-28T14:22:30',
      createdByServiceName: 'Remand and Sentencing',
      createdByUsername: 'REMAND_SENTENCING_TEST_USER',
      metadata: {
        caseReferences: ['BC23456789B'],
      },
    },
    {
      documentUuid: '80dffad6-ec63-47e5-9d79-cb96537081e7',
      documentType: 'HMCTS_WARRANT',
      documentFilename: '[devwarrant] Manchester City Magistrates Court, Taylor TINKER; yy-mm-dd; AB12345678A  .pdf',
      filename: '[devwarrant] Manchester City Magistrates Court, Taylor TINKER; yy-mm-dd; AB12345678A  ',
      fileExtension: 'pdf',
      fileSize: 12312556666,
      fileHash: '',
      mimeType: 'application/pdf',
      createdTime: '2026-03-29T14:08:14',
      createdByServiceName: 'Remand and Sentencing',
      createdByUsername: 'REMAND_SENTENCING_TEST_USER',
      metadata: {
        caseReferences: ['AB12345678A', 'BC23456789B'],
      },
    },
    {
      documentUuid: '80dffad6-ec63-47e5-9d79-cb96537081e8',
      documentType: 'HMCTS_WARRANT',
      documentFilename: '[devwarrant] Manchester City Magistrates Court, Taylor TINKER; yy-mm-dd; AB12345678A  .pdf',
      filename: '[devwarrant] Manchester City Magistrates Court, Taylor TINKER; yy-mm-dd; AB12345678A  ',
      fileExtension: 'pdf',
      fileSize: 12312556666,
      fileHash: '',
      mimeType: 'application/pdf',
      createdTime: '2026-05-13T14:08:14',
      createdByServiceName: 'Remand and Sentencing',
      createdByUsername: 'REMAND_SENTENCING_TEST_USER',
      metadata: {
        source: 'remand-and-sentencing-api',
      },
    },
    {
      documentUuid: '8980c409-465c-41a4-969d-affe0d9b9df7',
      documentType: 'HMCTS_WARRANT',
      documentFilename: 'CommonPlatformfile.pdf',
      filename: 'CommonPlatformfile',
      fileExtension: 'pdf',
      fileSize: 2233,
      fileHash: '',
      mimeType: 'application/pdf',
      createdTime: '2026-03-10T14:22:30',
      createdByServiceName: 'Remand and Sentencing',
      createdByUsername: 'REMAND_SENTENCING_TEST_USER',
      metadata: {
        source: 'court-data-ingestion-api',
        prisonerId: 'A12345B',
      },
    },
    {
      documentUuid: 'bdee9909-ba50-48d6-ad80-e8ecf6ffa912',
      documentType: 'HMCTS_WARRANT',
      documentFilename: 'CommonPlatformfile.pdf',
      filename: 'CommonPlatformfile',
      fileExtension: 'pdf',
      fileSize: 2233,
      fileHash: '',
      mimeType: 'application/pdf',
      createdTime: '2026-03-09T14:22:30',
      createdByServiceName: 'Remand and Sentencing',
      createdByUsername: 'REMAND_SENTENCING_TEST_USER',
      metadata: {
        source: 'court-data-ingestion-api',
        prisonerId: 'A12345B',
        isUnread: false,
      },
    },
    {
      // It is missing entry in CDIA
      documentUuid: '9612b032-383b-4a83-9765-30484182c7fa',
      documentType: 'HMCTS_WARRANT',
      documentFilename: 'CommonPlatformfile.pdf',
      filename: 'CommonPlatformfile',
      fileExtension: 'pdf',
      fileSize: 2233,
      fileHash: '',
      mimeType: 'application/pdf',
      createdTime: '2026-03-09T14:22:30',
      createdByServiceName: 'Remand and Sentencing',
      createdByUsername: 'REMAND_SENTENCING_TEST_USER',
      metadata: {
        source: 'court-data-ingestion-api',
        prisonerId: 'A12345B',
        isUnread: true,
      },
    },
  ],
  totalResultsCount: 7,
  facets,
}
