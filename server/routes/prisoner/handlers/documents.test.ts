import { Express } from 'express'

import request from 'supertest'
import PrisonerService from '../../../services/prisonerService'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import { Prisoner } from '../../../@types/prisonerSearchApi/types'
import PrisonerSearchService from '../../../services/prisonerSearchService'
import { CcrdServiceDefinitions } from '../../../@types/courtCasesReleaseDatesApi/types'
import DocumentManagementService from '../../../services/documentManagementService'
import { DocumentSearchResult } from '../../../@types/documentManagementApi/types'

jest.mock('../../../services/prisonerService')
jest.mock('../../../services/documentManagementService')
jest.mock('../../../services/prisonerSearchService')

const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const documentManagementService = new DocumentManagementService(null) as jest.Mocked<DocumentManagementService>
const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>

let app: Express

const defaultServices = {
  prisonerService,
  documentManagementService,
  prisonerSearchService,
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
    documentManagementService.searchDocument.mockResolvedValue({
      request: {},
      results: [
        {
          filename: 'file.pdf',
          fileExtension: 'pdf',
          createdTime: '2025-01-01T15:30:30',
          documentUuid: '123-123-123-123',
        },
      ],
    } as DocumentSearchResult)

    return request(app)
      .get('/prisoner/A12345B/documents')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.status).toBe(200)
        expect(res.text).toContain(
          '<a class="moj-sub-navigation__link" aria-current="page" href="http://localhost:8000/prisoner/AB1234AB/documents">Documents</a>',
        )
        expect(res.text).toContain('Documents')
        expect(res.text).toContain('Remand warrant')
        expect(res.text).toContain('href="/prisoner/A12345B/documents/123-123-123-123/download"')
        expect(res.text).toContain('Wednesday, 01 January 2025 at 15:30')
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
