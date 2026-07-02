import { Express } from 'express'

import request from 'supertest'
import * as cheerio from 'cheerio'
import { LatestCalculationCardConfig } from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/@types'
import PrisonerService from '../../../services/prisonerService'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import { Prisoner } from '../../../@types/prisonerSearchApi/types'
import PrisonerSearchService from '../../../services/prisonerSearchService'
import { CourtEventDetails } from '../../../@types/prisonApi/types'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { CcrdServiceDefinitions } from '../../../@types/courtCasesReleaseDatesApi/types'
import RemandAndSentencingService from '../../../services/remandAndSentencingService'
import PrisonService from '../../../services/prisonService'
import CourtRegisterService from '../../../services/courtRegisterService'
import ManageOffencesService from '../../../services/manageOffencesService'

jest.mock('../../../services/prisonerService')
jest.mock('../../../services/prisonerSearchService')
jest.mock('../../../services/calculateReleaseDatesService')
jest.mock('../../../services/remandAndSentencingService')
jest.mock('../../../services/courtRegisterService')
jest.mock('../../../services/manageOffencesService')

const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>
const calculateReleaseDatesService = new CalculateReleaseDatesService() as jest.Mocked<CalculateReleaseDatesService>
const remandAndSentencingService = new RemandAndSentencingService(null) as jest.Mocked<RemandAndSentencingService>
const prisonService = new PrisonService(null) as jest.Mocked<PrisonService>
const courtRegisterService = new CourtRegisterService(null) as jest.Mocked<CourtRegisterService>
const manageOffencesService = new ManageOffencesService(null) as jest.Mocked<ManageOffencesService>

let app: Express

const defaultServices = {
  prisonService,
  prisonerService,
  prisonerSearchService,
  calculateReleaseDatesService,
  remandAndSentencingService,
  courtRegisterService,
  manageOffencesService,
}

const defaultUser = { ...user, hasAdjustmentsAccess: true, hasRasAccess: true, hasRecallsAccess: true }

const defaultCourtCasesPage = {
  content: [
    {
      courtCaseUuid: '724e5b2c-2754-4455-b356-f4e2c2b3bc74',
      latestCourtAppearance: {
        courtCode: 'B10JQ',
        outcome: 'Imprisonment',
        charges: [
          {
            chargeUuid: 'charge-uuid-1',
            offenceCode: 'CJ88001',
            outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
            sentence: {
              sentenceUuid: 'sent-uuid-1',
              consecutiveToSentenceUuid: 'sentence-uuid-1',
              periodLengths: [],
            },
            legacyData: { offenceDescription: 'Common assault' },
            createdAt: '2024-01-01T00:00:00',
          },
        ],
      },
    },
  ],
} as any

beforeEach(() => {
  app = appWithAllRoutes({
    services: defaultServices,
    userSupplier: () => {
      return defaultUser
    },
  })

  remandAndSentencingService.searchCourtCases.mockResolvedValue(defaultCourtCasesPage as any)
  remandAndSentencingService.getConsecutiveToDetails.mockResolvedValue({
    sentences: [
      {
        sentenceUuid: 'sentence-uuid-1',
        offenceCode: 'CJ88117',
        chargeLegacyData: { offenceDescription: 'Possess knife blade or sharp pointed article' },
      },
    ],
  } as any)

  courtRegisterService.getCourtMap.mockResolvedValue({ B10JQ: 'Cambridge Magistrates Court' } as any)
  manageOffencesService.getOffenceMap.mockResolvedValue({
    CJ88001: 'CJ88001 Common assault',
    CJ88117: 'CJ88117 Possess knife blade or sharp pointed article',
  } as any)
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Route Handlers - Overview', () => {
  describe('Layout tests for overview', () => {
    it('should render prisoner details', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        imprisonmentStatusDescription: 'Life imprisonment',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getStartOfSentenceEnvelope.mockResolvedValue(new Date())
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)

      return request(app)
        .get('/prisoner/A12345B/readonly-overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('data-qa="mini-profile-prisoner-number">A12345B')
          expect(res.text).toContain('mini-profile-status">Life imprisonment<')
        })
    })

    it('should render service header', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)

      return request(app)
        .get('/prisoner/A12345B/readonly-overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('Court cases and release dates')
        })
    })

    it('should not render sub nav', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)

      return request(app)
        .get('/prisoner/A12345B/readonly-overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).not.toContain('data-qa="sub-nav"')
          expect(res.text).not.toContain('data-qa="sub-nav-adjustments"')
          expect(res.text).not.toContain('data-qa="sub-nav-release-dates"')
        })
    })

    it('should render feedback prompt', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)

      return request(app)
        .get('/prisoner/A12345B/readonly-overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('Did you find what you need?')
          expect(res.text).toContain(
            'This is a new service. To make it the best it can be, your feedback is essential.',
          )
          expect(res.text).toContain('Give feedback')
        })
    })

    it('should show latest calc with release date definition', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(true)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      calculateReleaseDatesService.getLatestCalculationForPrisoner.mockResolvedValue(latestCalculation)

      return request(app)
        .get('/prisoner/A12345B/readonly-overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect($('[data-qa=release-date-definitions-link]').first().attr('href')).toStrictEqual(
            'https://justiceuk.sharepoint.com/sites/Courtcaseandreleasedates/SitePages/Release-date-types-and-definitions.aspx',
          )
          expect(res.text).toContain('Calculation reason: Transfer check')
          expect(res.text).toContain('01 June 2024 at HMP Kirkham')
        })
    })

    it('displays an error page when the prisoner is inactive and the user lacks access to view inactive bookings', () => {
      app = appWithAllRoutes({
        services: {
          prisonerService,
          prisonerSearchService,
          calculateReleaseDatesService,
        },
        userSupplier: () => {
          return { ...user, hasInactiveBookingAccess: false, hasAdjustmentsAccess: true }
        },
      })
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        imprisonmentStatusDescription: 'Life imprisonment',
        prisonId: 'OUT',
      } as Prisoner)
      prisonerService.getStartOfSentenceEnvelope.mockResolvedValue(new Date())
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)

      return request(app)
        .get('/prisoner/A12345B/readonly-overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('The details for this person cannot be found')
        })
    })

    it('should pass zero-based page index when pageNumber query param is provided', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)

      await request(app).get('/prisoner/A12345B/readonly-overview?pageNumber=2').expect(200)

      expect(remandAndSentencingService.searchCourtCases).toHaveBeenCalledWith(
        'A12345B',
        defaultUser.username,
        'STATUS_APPEARANCE_DATE_DESC',
        1,
      )
    })

    it('should default to page index 0 when no pageNumber query param is provided', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)

      await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(remandAndSentencingService.searchCourtCases).toHaveBeenCalledWith(
        'A12345B',
        defaultUser.username,
        'STATUS_APPEARANCE_DATE_DESC',
        0,
      )
    })

    it('should build offence lookup from charge and consecutive sentence offence codes', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)

      await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(manageOffencesService.getOffenceMap).toHaveBeenCalledWith(
        expect.arrayContaining(['CJ88001', 'CJ88117']),
        defaultUser.username,
        expect.arrayContaining([['CJ88001', 'Common assault']]),
      )
    })

    it('should call getConsecutiveToDetails with sentence uuids from charges', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)

      await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(remandAndSentencingService.getConsecutiveToDetails).toHaveBeenCalledWith(
        expect.arrayContaining(['sentence-uuid-1']),
        defaultUser.username,
      )
    })

    it('should render court case card with court name from court register', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(res.text).toContain('Cambridge Magistrates Court')
      expect(res.text).toContain('data-qa="courtCaseCard-724e5b2c-2754-4455-b356-f4e2c2b3bc74"')
    })

    it('should render offence outcome from offenceOutcomeMap', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(res.text).toContain('Imprisonment')
    })

    it('should render no release dates section when prisoner has no active sentences', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      const $ = cheerio.load(res.text)
      expect($('[data-qa=release-date-definitions-link]').length).toBe(0)
    })
  })
})

const serviceDefinitionsNoThingsToDo = {
  services: {
    overview: {
      href: 'http://localhost:8000/prisoner/AB1234AB/readonly-overview',
      text: 'Overview',
      thingsToDo: {
        things: [],
        count: 0,
      },
      maintenanceAlert: {
        enabled: false,
        message: 'placeholder',
      },
    },
    adjustments: {
      href: 'http://localhost:8002/AB1234AB',
      text: 'Adjustments',
      thingsToDo: {
        things: [],
        count: 0,
      },
      maintenanceAlert: {
        enabled: false,
        message: 'placeholder',
      },
    },
    releaseDates: {
      href: 'http://localhost:8004?prisonId=AB1234AB',
      text: 'Release dates and calculations',
      thingsToDo: {
        things: [],
        count: 0,
      },
      maintenanceAlert: {
        enabled: false,
        message: 'placeholder',
      },
    },
  },
  maintenanceAlert: {
    enabled: false,
    message: 'placeholder',
  },
} as CcrdServiceDefinitions

const serviceDefinitionsThingsToDoNotifications = {
  services: {
    overview: {
      href: 'http://localhost:8000/prisoner/AB1234AB/readonly-overview',
      text: 'Overview',
      thingsToDo: {
        things: [],
        count: 0,
      },
      maintenanceAlert: {
        enabled: false,
        message: 'placeholder',
      },
    },
    adjustments: {
      href: 'http://localhost:8002/AB1234AB',
      text: 'Adjustments',
      thingsToDo: {
        things: [],
        count: 0,
      },
      maintenanceAlert: {
        enabled: false,
        message: 'placeholder',
      },
    },
    releaseDates: {
      href: 'http://localhost:8004?prisonId=AB1234AB',
      text: 'Release dates and calculations',
      thingsToDo: {
        things: [],
        count: 0,
      },
      maintenanceAlert: {
        enabled: false,
        message: 'placeholder',
      },
    },
    documents: {
      href: 'http://localhost:8004?prisonId=AB1234AB',
      text: 'Release dates and calculations',
      thingsToDo: {
        severity: 'NOTIFICATION',
        things: [
          {
            buttonHref: '',
            buttonText: '',
            message: '',
            title: '',
            type: 'HMCTS_API_DOCUMENT_RECEIVED',
          },
        ],
        count: 1,
      },
      maintenanceAlert: {
        enabled: false,
        message: 'placeholder',
      },
    },
  },
  maintenanceAlert: {
    enabled: false,
    message: 'placeholder',
  },
} as CcrdServiceDefinitions

const latestCalculation = {
  calculatedAt: '2024-06-01T10:30:45',
  establishment: 'HMP Kirkham',
  reason: 'Transfer check',
  source: 'CRDS',
  dates: [
    {
      type: 'CRD',
      description: 'Conditional release date',
      date: '2034-02-19',
      hints: [
        {
          text: 'Friday, 17 February 2034 when adjusted to a working day',
        },
      ],
    },
  ],
} as LatestCalculationCardConfig
