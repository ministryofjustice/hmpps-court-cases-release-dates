import { Express } from 'express'
import request from 'supertest'
import { constants } from 'node:http2'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import { Document, DocumentSearchResult, FileDownload } from '../../@types/documentManagementApi/types'
import DocumentManagementService from '../../services/documentManagementService'
import { Role, Roles } from '../../@types/roles'

jest.mock('../../services/documentManagementService')

const documentManagementService = new DocumentManagementService(null) as jest.Mocked<DocumentManagementService>

let app: Express

const defaultServices = {
  documentManagementService,
}

const defaultUser = {
  ...user,
  hasAdjustmentsAccess: true,
  hasRasAccess: true,
  hasRecallsAccess: true,
  roles: [Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)],
}

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

describe('Route Handlers - Unmatched documents role check access control', () => {
  let appWithoutAccess: Express
  const userWithoutAccess = { ...defaultUser, roles: [] as string[] }

  const documentId = '4fd5f7b0-eebf-4b69-9489-0cc48550e03b'
  type DocumentRoute = { method: 'get' | 'post'; path: string }
  const pageRoute: DocumentRoute = { method: 'get', path: '/unmatched-documents' }
  const downloadRoutes: DocumentRoute[] = [
    { method: 'get', path: `/unmatched-documents/${documentId}/download` },
    { method: 'get', path: `/unmatched-documents/${documentId}/download/warrant.pdf` },
  ]
  const allRoutes: DocumentRoute[] = [pageRoute, ...downloadRoutes]

  const call = (testApp: Express, { method, path }: DocumentRoute) =>
    method === 'post' ? request(testApp).post(path).send() : request(testApp).get(path)

  beforeEach(() => {
    appWithoutAccess = appWithAllRoutes({
      services: defaultServices,
      userSupplier: () => userWithoutAccess,
    })

    documentManagementService.searchDocument.mockResolvedValue(documents)
    documentManagementService.getDocument.mockResolvedValue(documents.results[0] as Document)
    documentManagementService.downloadDocument.mockReturnValue(fileDownload)
  })

  it('the documents page redirects to the auth error page without the COURTCASE_RELEASEDATE_SUPPORT role', () => {
    return call(appWithoutAccess, pageRoute).expect(constants.HTTP_STATUS_FOUND).expect('Location', '/authError')
  })

  it.each(downloadRoutes)('$method $path returns 302 without the COURTCASE_RELEASEDATE_SUPPORT role', route => {
    return call(appWithoutAccess, route).expect(res => {
      expect(res.status).toBe(302)
    })
  })

  it.each(allRoutes)(
    '$method $path does not reach any downstream service without the COURTCASE_RELEASEDATE_SUPPORT role',
    async route => {
      await call(appWithoutAccess, route)

      expect(documentManagementService.searchDocument).not.toHaveBeenCalled()
      expect(documentManagementService.getDocument).not.toHaveBeenCalled()
      expect(documentManagementService.downloadDocument).not.toHaveBeenCalled()
    },
  )

  it.each(allRoutes)(
    '$method $path is not denied when the user holds the COURTCASE_RELEASEDATE_SUPPORT role',
    async route => {
      const res = await call(app, route)

      expect(res.status).not.toBe(constants.HTTP_STATUS_FORBIDDEN)
      expect(res.headers.location).not.toBe('/authError')
    },
  )
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
