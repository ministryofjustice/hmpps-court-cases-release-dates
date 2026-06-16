import { Express } from 'express'

import request from 'supertest'
import * as cheerio from 'cheerio'
import { constants } from 'node:http2'
import PrisonerService from '../../../services/prisonerService'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import { Prisoner } from '../../../@types/prisonerSearchApi/types'
import PrisonerSearchService from '../../../services/prisonerSearchService'
import { CcrdServiceDefinitions } from '../../../@types/courtCasesReleaseDatesApi/types'
import DocumentManagementService from '../../../services/documentManagementService'
import { Document, DocumentSearchResult, FileDownload } from '../../../@types/documentManagementApi/types'
import RemandAndSentencingService from '../../../services/remandAndSentencingService'
import CourtRegisterService from '../../../services/courtRegisterService'
import CourtDataIngestionService from '../../../services/courtDataIngestionService'
import { CourtDocument } from '../../../@types/courtDataIngestionApi/types'
import { RaSDocumentMapper } from '../../../@types/remandAndSentencingApi/types'

jest.mock('../../../services/prisonerService')
jest.mock('../../../services/documentManagementService')
jest.mock('../../../services/prisonerSearchService')
jest.mock('../../../services/remandAndSentencingService')
jest.mock('../../../services/courtDataIngestionService')
jest.mock('../../../services/courtRegisterService')

const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const documentManagementService = new DocumentManagementService(null) as jest.Mocked<DocumentManagementService>
const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>
const remandAndSentencingService = new RemandAndSentencingService(null) as jest.Mocked<RemandAndSentencingService>
const courtDataIngestionService = new CourtDataIngestionService(null) as jest.Mocked<CourtDataIngestionService>
const courtRegisterService = new CourtRegisterService(null) as jest.Mocked<CourtRegisterService>

let app: Express

const defaultServices = {
  prisonerService,
  documentManagementService,
  prisonerSearchService,
  remandAndSentencingService,
  courtDataIngestionService,
  courtRegisterService,
}

const defaultUser = { ...user, hasAdjustmentsAccess: true, hasRasAccess: true, hasRecallsAccess: true }

beforeEach(() => {
  app = appWithAllRoutes({
    services: defaultServices,
    userSupplier: () => {
      return defaultUser
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Route Handlers - Overview', () => {
  it('should render prisoner details', () => {
    prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
      prisonerNumber: 'A12345B',
      imprisonmentStatusDescription: 'Life imprisonment',
      prisonId: 'MDI',
    } as Prisoner)
    prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
    documentManagementService.searchDocument.mockResolvedValue(documents)
    remandAndSentencingService.getDocuments.mockResolvedValue(rasDocuments)
    courtDataIngestionService.getDocuments.mockResolvedValue(cpDocuments)
    courtRegisterService.getCourtName
      .mockReturnValue('LVRPCC' as unknown as Promise<string>)
      .mockReturnValueOnce('LV Liverpool Court' as unknown as Promise<string>)
      .mockReturnValueOnce('MN Manchester Court' as unknown as Promise<string>)
      .mockReturnValueOnce('MN Manchester Court' as unknown as Promise<string>)

    return request(app)
      .get('/prisoner/A12345B/documents')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.status).toBe(200)
        expect(res.text).toContain(
          '<a class="moj-sub-navigation__link" aria-current="page" href="http://localhost:8000/prisoner/AB1234AB/documents">Documents</a>',
        )
        expect(res.text).toContain('Documents')
        expect(res.text).toContain(
          'Sort by: <a class="govuk-link govuk-link--no-visited-state govuk-!-margin-right-1" href="/prisoner/A12345B/documents?sortBy=MOST_RECENT">Most recent</a>',
        )
        expect(res.text).toContain(
          '<a class="govuk-link govuk-link--no-visited-state" href="/prisoner/A12345B/documents?sortBy=EARLIEST">Earliest<a>',
        )

        const $ = cheerio.load(res.text)
        const firstCommonPlatformDocumentText = $('[data-qa=document-4fd5f7b0-eebf-4b69-9489-0cc48550e03b]').text()
        expect(firstCommonPlatformDocumentText).toContain('Prison court register')
        expect(firstCommonPlatformDocumentText).toContain('PDF 2.18 KB')
        expect(firstCommonPlatformDocumentText).toContain('Common Platform')
        expect(firstCommonPlatformDocumentText).toContain('Case reference')
        expect(firstCommonPlatformDocumentText).toContain('CommonPlatformCase123, CommonPlatformCase456')
        expect(firstCommonPlatformDocumentText).toContain('Hearing date')
        expect(firstCommonPlatformDocumentText).not.toContain('Warrant date')
        expect(firstCommonPlatformDocumentText).toContain('27 March 2026')
        expect(firstCommonPlatformDocumentText).toContain('New')
        expect(firstCommonPlatformDocumentText).toContain('Date added')
        expect(firstCommonPlatformDocumentText).toContain('27 March 2026 at 14:22')

        const secondRasDocument = $('[data-qa=document-c43f547c-35e9-4c9a-b7dc-c166223056cb]')
        const secondRasDocumentText = secondRasDocument.text()
        expect(secondRasDocumentText).toContain('Prison court register')
        expect(secondRasDocumentText).toContain('PDF 119.41 MB')
        expect(secondRasDocumentText).toContain('Court cases')
        expect(secondRasDocumentText).toContain('Case reference')
        const secondRasDocumentCaseRef = secondRasDocument.find('[data-qa=case-reference]').text()
        expect(secondRasDocumentCaseRef).toContain('BC23456789B')
        expect(secondRasDocumentText).toContain('Court name')
        const secondRasDocumentCourtName = secondRasDocument.find('[data-qa=court-name]').text()
        expect(secondRasDocumentCourtName).toContain('LV Liverpool Court')
        expect(secondRasDocumentText).toContain('Hearing date')
        const secondRasDocumentHearingDate = secondRasDocument.find('[data-qa=hearing-date]').text()
        expect(secondRasDocumentHearingDate).toContain('05 October 2025')
        expect(secondRasDocumentText).not.toContain('Warrant date')
        expect(secondRasDocumentText).toContain('28 March 2026')
        expect(secondRasDocumentText).not.toContain('New')
        const secondRasDocumentLink = secondRasDocument.find('a[data-qa=court-case-link]').attr('href')
        expect(secondRasDocumentLink).toContain(
          'http://localhost:3000/person/A12345B/view-court-case/c6bbb5bb-1086-473f-8eff-1d25ee305750/details',
        )

        const thirdRasDocument = $('[data-qa=document-80dffad6-ec63-47e5-9d79-cb96537081e7]')
        const thirdRasDocumentText = thirdRasDocument.text()
        expect(thirdRasDocumentText).toContain('Sentencing warrant')
        expect(thirdRasDocumentText).toContain('PDF 11.47 GB')
        expect(thirdRasDocumentText).toContain('Court cases')
        expect(thirdRasDocumentText).toContain('Case reference')
        const thirdRasDocumentCaseRef = thirdRasDocument.find('[data-qa=case-reference]').text()
        expect(thirdRasDocumentCaseRef).toContain('AB12345678A')
        expect(thirdRasDocumentText).toContain('Court name')
        const thirdRasDocumentTextCourtName = thirdRasDocument.find('[data-qa=court-name]').text()
        expect(thirdRasDocumentTextCourtName).toContain('MN Manchester Court')
        expect(thirdRasDocumentText).not.toContain('Hearing date')
        expect(thirdRasDocumentText).toContain('Warrant date')
        const thirdRasDocumentWarrantDate = thirdRasDocument.find('[data-qa=warrant-date]').text()
        expect(thirdRasDocumentWarrantDate).toContain('04 November 2025')
        expect(thirdRasDocumentText).toContain('29 March 2026')
        expect(thirdRasDocumentText).not.toContain('New')
        const thirdRasDocumentLink = thirdRasDocument.find('a[data-qa=court-case-link]').attr('href')
        expect(thirdRasDocumentLink).toContain(
          'http://localhost:3000/person/A12345B/view-court-case/9916c639-b188-47fe-842f-451d1f598cab/details',
        )

        const fourthRasDocument = $('[data-qa=document-80dffad6-ec63-47e5-9d79-cb96537081e8]')
        const fourthRasDocumentText = fourthRasDocument.text()
        expect(fourthRasDocumentText).toContain('Sentencing warrant')
        expect(fourthRasDocumentText).toContain('PDF 11.47 GB')
        expect(fourthRasDocumentText).toContain('Court cases')
        expect(fourthRasDocumentText).toContain('Case reference')
        const fourthRasDocumentCaseRef = fourthRasDocument.find('[data-qa=case-reference]').text()
        expect(fourthRasDocumentCaseRef).toContain(RaSDocumentMapper.CASE_REFERENCE_NOT_ENTERED)
        expect(fourthRasDocumentText).toContain('Court name')
        const fourthRasDocumentTextCourtName = fourthRasDocument.find('[data-qa=court-name]').text()
        expect(fourthRasDocumentTextCourtName).toContain('MN Manchester Court')
        expect(fourthRasDocumentText).not.toContain('Hearing date')
        expect(fourthRasDocumentText).toContain('Warrant date')
        const fourthRasDocumentWarrantDate = fourthRasDocument.find('[data-qa=warrant-date]').text()
        expect(fourthRasDocumentWarrantDate).toContain('31 January 2026')
        expect(fourthRasDocumentText).toContain('13 May 2026')
        expect(fourthRasDocumentText).not.toContain('New')
        const fourthRasDocumentLink = fourthRasDocument.find('a[data-qa=court-case-link]').attr('href')
        expect(fourthRasDocumentLink).toContain(
          'http://localhost:3000/person/A12345B/view-court-case/9916c639-b188-47fe-842f-451d1f598cab/details',
        )

        const fifthCommonPlatformDocument = $('[data-qa=document-8980c409-465c-41a4-969d-affe0d9b9df7]')
        const fifthCommonPlatformDocumentText = fifthCommonPlatformDocument.text()
        expect(fifthCommonPlatformDocumentText).toContain('Sentencing warrant')
        const fifthCommonPlatformDocumentHearingTypeText = fifthCommonPlatformDocument
          .find('[data-qa=hearing-type]')
          .text()
        expect(fifthCommonPlatformDocumentHearingTypeText).toContain('First hearing')
        const fifthCommonPlatformDocumentCourtName = fifthCommonPlatformDocument.find('[data-qa=court-name]').text()
        expect(fifthCommonPlatformDocumentCourtName).toContain('Court 345')
        const fifthCommonPlatformDocumentHearingDate = fifthCommonPlatformDocument.find('[data-qa=hearing-date]').text()
        expect(fifthCommonPlatformDocumentHearingDate).toBe('01 January 2026')

        const sixthCommonPlatformDocument = $('[data-qa=document-bdee9909-ba50-48d6-ad80-e8ecf6ffa912]')
        const sxithCommonPlatformDocumentText = sixthCommonPlatformDocument.text()
        expect(sxithCommonPlatformDocumentText).toContain('Common platform document')
        const sixthCommonPlatformDocumentHearingTypeText = sixthCommonPlatformDocument
          .find('[data-qa=hearing-type]')
          .text()
        expect(sixthCommonPlatformDocumentHearingTypeText).toContain('Remand')
        const sixthCommonPlatformDocumentCourtName = sixthCommonPlatformDocument.find('[data-qa=court-name]').text()
        expect(sixthCommonPlatformDocumentCourtName).toContain('Court 678')
        const sixthCommonPlatformDocumentHearingDate = sixthCommonPlatformDocument.find('[data-qa=hearing-date]').text()
        expect(sixthCommonPlatformDocumentHearingDate).toBe('01 January 2025')

        const seventhCommonPlatformDocument = $('[data-qa=document-9612b032-383b-4a83-9765-30484182c7fa]')
        const seventhCommonPlatformDocumentText = seventhCommonPlatformDocument.text()
        expect(seventhCommonPlatformDocumentText).toContain('Remand warrant')
        const seventhCommonPlatformDocumentHearingTypeText = seventhCommonPlatformDocument
          .find('[data-qa=hearing-type]')
          .text()
        expect(seventhCommonPlatformDocumentHearingTypeText).toBe('')
        const seventhCommonPlatformDocumentCourtName = seventhCommonPlatformDocument.find('[data-qa=court-name]').text()
        expect(seventhCommonPlatformDocumentCourtName).toBe('')
        const seventhCommonPlatformDocumentHearingDate = seventhCommonPlatformDocument
          .find('[data-qa=hearing-date]')
          .text()
        expect(seventhCommonPlatformDocumentHearingDate).toBe('')
      })
  })

  it('should display maintenance banner', () => {
    prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
      prisonerNumber: 'A12345B',
      imprisonmentStatusDescription: 'Life imprisonment',
      prisonId: 'MDI',
    } as Prisoner)
    const serviceDefinitionsMaintenanceEnabled = {
      ...serviceDefinitionsNoThingsToDo,
      maintenanceAlert: {
        enabled: true,
        message: 'There is due to be an outage in the future',
      },
    }
    prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsMaintenanceEnabled)
    documentManagementService.searchDocument.mockResolvedValue({
      request: {
        documentTypes: [],
        metadata: null,
        page: 0,
        pageSize: 0,
        orderBy: 'CREATED_TIME',
        orderByDirection: 'ASC',
      },
      results: [],
      totalResultsCount: 0,
    })
    remandAndSentencingService.getDocuments.mockResolvedValue({ courtCaseDocuments: [] })
    courtDataIngestionService.getDocuments.mockResolvedValue([])
    return request(app)
      .get('/prisoner/A12345B/documents')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.status).toBe(200)
        expect(res.text).toContain(serviceDefinitionsMaintenanceEnabled.maintenanceAlert.message)
      })
  })
})

describe('Route Handlers - Download Document', () => {
  it('Valid document - should return 200 on successful download', () => {
    prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
      prisonerNumber: 'A12345B',
      imprisonmentStatusDescription: 'Life imprisonment',
      prisonId: 'MDI',
    } as Prisoner)
    prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
    documentManagementService.getDocument.mockResolvedValue(documents.results[0] as Document)
    documentManagementService.downloadDocument.mockReturnValueOnce(fileDownload)

    return request(app)
      .get('/prisoner/A12345B/documents/4fd5f7b0-eebf-4b69-9489-0cc48550e03b/download')
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect(res => {
        expect(res.status).toBe(constants.HTTP_STATUS_OK) // We're only interested in testing the validation here, not the download
      })
  })
  it('Invalid document not matching prisonerIds - should return 403 after download error', () => {
    prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
      prisonerNumber: 'A12345B',
      imprisonmentStatusDescription: 'Life imprisonment',
      prisonId: 'MDI',
    } as Prisoner)
    prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
    documentManagementService.getDocument.mockResolvedValue(documents.results[0] as Document)
    documentManagementService.downloadDocument.mockReturnValueOnce(fileDownload)

    return request(app)
      .get('/prisoner/A12345C/documents/4fd5f7b0-eebf-4b69-9489-0cc48550e03b/download')
      .expect(res => {
        expect(res.status).toBe(constants.HTTP_STATUS_FORBIDDEN)
      })
  })
})

const serviceDefinitionsNoThingsToDo = {
  services: {
    overview: {
      href: 'http://localhost:8000/prisoner/AB1234AB/overview',
      text: 'Overview',
      thingsToDo: {
        things: [],
        count: 0,
      },
    },
    adjustments: {
      href: 'http://localhost:8002/AB1234AB',
      text: 'Adjustments',
      thingsToDo: {
        things: [],
        count: 0,
      },
    },
    releaseDates: {
      href: 'http://localhost:8004?prisonId=AB1234AB',
      text: 'Release dates and calculations',
      thingsToDo: {
        things: [],
        count: 0,
      },
    },
    documents: {
      href: 'http://localhost:8000/prisoner/AB1234AB/documents',
      text: 'Documents',
      thingsToDo: {
        things: [],
        count: 0,
      },
    },
  },
} as CcrdServiceDefinitions

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
      metadata: {},
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
      metadata: {},
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
      metadata: {},
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
      },
    },
    {
      // Has missing entry in CDIA
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
      },
    },
  ],
  totalResultsCount: 7,
} as DocumentSearchResult

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
    isUnread: true,
    documentType: 'COMMON_PLATFORM_DOCUMENT',
    courtHearing: {
      courtName: 'Court 678',
      hearingType: 'Remand',
      hearingDate: '2025-01-01T12:34',
    },
  },
] as CourtDocument[]

const rasDocuments = {
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
            fileName: '[devwarrant] Manchester City Magistrates Court, Taylor TINKER; yy-mm-dd; AB12345678A  .pdf',
            warrantDate: '2025-11-04',
            caseReference: 'AB12345678A',
            courtCode: 'MNCHMC',
            warrantType: 'SENTENCING',
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
}

const fileDownload = {
  body: Buffer.from('test', 'utf-8'),
  header: {
    'content-disposition': 'attachment',
    'content-length': '4',
    'content-type': 'text/plain',
  },
} as unknown as Promise<FileDownload>
