import { Express } from 'express'
import request from 'supertest'
import { constants } from 'node:http2'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import { Document, DocumentSearchResult, FileDownload } from '../../@types/documentManagementApi/types'
import DocumentManagementService from '../../services/documentManagementService'

jest.mock('../../services/documentManagementService')

const documentManagementService = new DocumentManagementService(null) as jest.Mocked<DocumentManagementService>

let app: Express

const defaultServices = {
  documentManagementService,
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

describe('Route Handlers - Valid Document Before Download', () => {
  it('should return valid download when prisonerId is null', () => {
    documentManagementService.getDocument.mockResolvedValue(documents.results[0] as Document)
    documentManagementService.downloadDocument.mockReturnValueOnce(fileDownload)

    return request(app)
      .get('/unmatched-documents/4fd5f7b0-eebf-4b69-9489-0cc48550e03b/download')
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect('Content-Disposition', 'attachment')
      .expect(res => {
        expect(res.status).toBe(constants.HTTP_STATUS_OK)
      })
  })
  it('should return valid download when prisonerId is not present in metadata', () => {
    documentManagementService.getDocument.mockResolvedValue(documents.results[1] as Document)
    documentManagementService.downloadDocument.mockReturnValueOnce(fileDownload)

    return request(app)
      .get('/unmatched-documents/c43f547c-35e9-4c9a-b7dc-c166223056cb/download')
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect('Content-Disposition', 'attachment')
      .expect(res => {
        expect(res.status).toBe(constants.HTTP_STATUS_OK)
      })
  })
  it('should return invalid download when document is matched to a prisonerId', () => {
    documentManagementService.getDocument.mockResolvedValue(documents.results[2] as Document)
    documentManagementService.downloadDocument.mockReturnValueOnce(fileDownload)

    return request(app)
      .get('/unmatched-documents/80dffad6-ec63-47e5-9d79-cb96537081e7/download')
      .expect(res => {
        expect(res.status).toBe(constants.HTTP_STATUS_FORBIDDEN)
      })
  })
})

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
        prisonerId: null,
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
      metadata: {
        prisonerId: 'A12345B',
      },
    },
  ],
  totalResultsCount: 3,
} as unknown as DocumentSearchResult

const fileDownload = {
  body: Buffer.from('test', 'utf-8'),
  header: {
    'content-disposition': 'attachment',
    'content-length': '4',
    'content-type': 'text/plain',
  },
} as unknown as Promise<FileDownload>
