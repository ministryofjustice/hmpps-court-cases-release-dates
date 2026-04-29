import { Express } from 'express'

import request from 'supertest'
import * as cheerio from 'cheerio'
import PrisonerService from '../../../services/prisonerService'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import { Prisoner } from '../../../@types/prisonerSearchApi/types'
import PrisonerSearchService from '../../../services/prisonerSearchService'
import { CcrdServiceDefinitions } from '../../../@types/courtCasesReleaseDatesApi/types'
import DocumentManagementService from '../../../services/documentManagementService'
import { DocumentSearchResult } from '../../../@types/documentManagementApi/types'
import RemandAndSentencingService from '../../../services/remandAndSentencingService'

jest.mock('../../../services/prisonerService')
jest.mock('../../../services/documentManagementService')
jest.mock('../../../services/prisonerSearchService')
jest.mock('../../../services/remandAndSentencingService')

const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const documentManagementService = new DocumentManagementService(null) as jest.Mocked<DocumentManagementService>
const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>
const remandAndSentencingService = new RemandAndSentencingService(null) as jest.Mocked<RemandAndSentencingService>

let app: Express

const defaultServices = {
  prisonerService,
  documentManagementService,
  prisonerSearchService,
  remandAndSentencingService,
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
        expect(firstCommonPlatformDocumentText).toContain('2.18 KB PDF')
        expect(firstCommonPlatformDocumentText).toContain('Common Platform')
        expect(firstCommonPlatformDocumentText).toContain('27 March 2026')

        const secondRasDocument = $('[data-qa=document-c43f547c-35e9-4c9a-b7dc-c166223056cb]')
        const secondRasDocumentText = secondRasDocument.text()
        expect(secondRasDocumentText).toContain('Prison court register')
        expect(secondRasDocumentText).toContain('119.41 MB PDF')
        expect(secondRasDocumentText).toContain('Court cases')
        expect(secondRasDocumentText).toContain('28 March 2026')
        const secondRasDocumentLink = secondRasDocument.find('a[data-qa=court-case-link]').attr('href')
        expect(secondRasDocumentLink).toContain(
          'http://localhost:3000/person/A12345B/view-court-case/c6bbb5bb-1086-473f-8eff-1d25ee305750/details',
        )

        const thirdRasDocument = $('[data-qa=document-80dffad6-ec63-47e5-9d79-cb96537081e7]')
        const thirdRasDocumentText = thirdRasDocument.text()
        expect(thirdRasDocumentText).toContain('Sentencing warrant')
        expect(thirdRasDocumentText).toContain('11.47 GB PDF')
        expect(thirdRasDocumentText).toContain('Court cases')
        expect(thirdRasDocumentText).toContain('29 March 2026')
        const thirdRasDocumentLink = thirdRasDocument.find('a[data-qa=court-case-link]').attr('href')
        expect(thirdRasDocumentLink).toContain(
          'http://localhost:3000/person/A12345B/view-court-case/9916c639-b188-47fe-842f-451d1f598cab/details',
        )
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
  ],
  totalResultsCount: 3,
} as DocumentSearchResult
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
  ],
}
