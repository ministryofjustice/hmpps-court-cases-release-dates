import { Express } from 'express'

import request from 'supertest'
import * as cheerio from 'cheerio'
import PrisonerService from '../../../services/prisonerService'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import { Prisoner } from '../../../@types/prisonerSearchApi/types'
import PrisonerSearchService from '../../../services/prisonerSearchService'
import { CourtEventDetails } from '../../../@types/prisonApi/types'
import AdjustmentsService from '../../../services/adjustmentsService'
import { Adjustment } from '../../../@types/adjustmentsApi/types'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { CcrdServiceDefinitions } from '../../../@types/courtCasesReleaseDatesApi/types'
import RemandAndSentencingService from '../../../services/remandAndSentencingService'
import config from '../../../config'
import {
  ImmigrationDetention,
  Recall,
  RecallTypes,
} from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import PrisonService from '../../../services/prisonService'

jest.mock('../../../services/prisonService')
jest.mock('../../../services/prisonerService')
jest.mock('../../../services/prisonerSearchService')
jest.mock('../../../services/adjustmentsService')
jest.mock('../../../services/calculateReleaseDatesService')
jest.mock('../../../services/remandAndSentencingService')

const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>
const adjustmentsService = new AdjustmentsService(null) as jest.Mocked<AdjustmentsService>
const calculateReleaseDatesService = new CalculateReleaseDatesService() as jest.Mocked<CalculateReleaseDatesService>
const remandAndSentencingService = new RemandAndSentencingService(null) as jest.Mocked<RemandAndSentencingService>
const prisonService = new PrisonService(null) as jest.Mocked<PrisonService>

let app: Express

const defaultServices = {
  prisonService,
  prisonerService,
  prisonerSearchService,
  adjustmentsService,
  calculateReleaseDatesService,
  remandAndSentencingService,
}

const userWithImmigrationDetentionAccess = {
  ...user,
  hasAdjustmentsAccess: true,
  hasImmigrationDetentionAccess: true,
}

beforeEach(() => {
  app = appWithAllRoutes({
    services: defaultServices,
    userSupplier: () => {
      return { ...user, hasAdjustmentsAccess: true, hasRasAccess: true }
    },
  })
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
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)

      return request(app)
        .get('/prisoner/A12345B/overview')
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
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('Court cases and release dates')
        })
    })

    it('should render sub nav', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('Overview')
          expect(res.text).toContain('Adjustments')
          expect(res.text).toContain('Release dates and calculations')
        })
    })

    it('should render immigration detention section when there is a record and the user has the correct role', () => {
      app = appWithAllRoutes({
        services: defaultServices,
        userSupplier: () => userWithImmigrationDetentionAccess,
      })
      app.locals.immigrationDetentionEnabled = true
      config.applications.immigrationDetention.url = 'http://localhost:9005/immigration-detention'

      const IMMIGRATION_DETENTION_NLI_OBJECT: ImmigrationDetention = {
        source: 'DPS',
        immigrationDetentionUuid: 'IMM-DET-UUID-12345',
        prisonerId: 'A12345B',
        immigrationDetentionRecordType: 'NO_LONGER_OF_INTEREST',
        recordDate: '2022-06-22',
        homeOfficeReferenceNumber: 'A12345B',
        noLongerOfInterestReason: 'OTHER_REASON',
        noLongerOfInterestComment: 'Confirmed not of interest',
        createdAt: '2025-11-03T08:06:37.123Z',
      }

      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(
        IMMIGRATION_DETENTION_NLI_OBJECT,
      )

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          const immigrationDetentionTitle = $('[data-qa=immigration-detention-header]').first()
          expect(immigrationDetentionTitle.text().trim()).toStrictEqual('Immigration documents')

          const addImmigrationDetentionLink = $('[data-qa=immigration-detention-record-link]').first()
          expect(addImmigrationDetentionLink.attr('href')).toStrictEqual(
            'http://localhost:9005/immigration-detention/A12345B/immigration-detention/add',
          )

          const immigrationDetentionMsg = $('[data-qa=immigration-detention-message]').first()
          expect(immigrationDetentionMsg.text().trim()).toStrictEqual(
            'No longer of interest to Home Office dated 22 June 2022',
          )

          const overviewImmigrationDetentionLink = $('[data-qa=immigration-detention-overview-link]')
          expect(overviewImmigrationDetentionLink.attr('href')).toStrictEqual(
            'http://localhost:9005/immigration-detention/A12345B/immigration-detention/overview',
          )

          expect(res.text).toContain('Overview')
          expect(res.text).toContain('Adjustments')
          expect(res.text).toContain('Release dates and calculations')
        })
    })

    it('should render immigration detention section if the user has the correct role', () => {
      app = appWithAllRoutes({
        services: defaultServices,
        userSupplier: () => userWithImmigrationDetentionAccess,
      })
      app.locals.immigrationDetentionEnabled = true
      config.applications.immigrationDetention.url = 'http://localhost:9005/immigration-detention'

      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          const immigrationDetentionTitle = $('[data-qa=immigration-detention-header]').first()
          expect(immigrationDetentionTitle.text().trim()).toStrictEqual('Immigration documents')

          const addImmigrationDetentionLink = $('[data-qa=immigration-detention-record-link]').first()
          expect(addImmigrationDetentionLink.attr('href')).toStrictEqual(
            'http://localhost:9005/immigration-detention/A12345B/immigration-detention/add',
          )

          const immigrationDetentionMsg = $('[data-qa=immigration-detention-message]').first()
          expect(immigrationDetentionMsg.text().trim()).toStrictEqual('There are no immigration documents recorded.')

          const overviewImmigrationDetentionLink = $('[data-qa=immigration-detention-overview-link]')
          expect(overviewImmigrationDetentionLink.length).toBe(0)

          expect(res.text).toContain('Overview')
          expect(res.text).toContain('Adjustments')
          expect(res.text).toContain('Release dates and calculations')
        })
    })

    test.each`
      immigrationDetentionToggle
      ${true}
      ${false}
    `(
      'should not render immigration detention section if the user does not have a suitable role',
      immigrationDetentionToggle => {
        app.locals.immigrationDetentionEnabled = immigrationDetentionToggle
        config.applications.immigrationDetention.url = 'http://localhost:9005/immigration-detention'

        prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
          prisonerNumber: 'A12345B',
          prisonId: 'MDI',
        } as Prisoner)
        prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
        adjustmentsService.getAdjustments.mockResolvedValue([])
        prisonerService.hasActiveSentences.mockResolvedValue(false)
        prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
        remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

        return request(app)
          .get('/prisoner/A12345B/overview')
          .expect('Content-Type', /html/)
          .expect(res => {
            const $ = cheerio.load(res.text)

            const immigrationDetentionTitle = $('[data-qa=immigration-detention-header]')
            expect(immigrationDetentionTitle.length).toBe(0)

            const addImmigrationDetentionLink = $('[data-qa=immigration-detention-record-link]')
            expect(addImmigrationDetentionLink.length).toBe(0)

            const overviewImmigrationDetentionLink = $('[data-qa=immigration-detention-overview-link]')
            expect(overviewImmigrationDetentionLink.length).toBe(0)

            const immigrationDetentionMsg = $('[data-qa=immigration-detention-message]')
            expect(immigrationDetentionMsg.length).toBe(0)

            expect(res.text).toContain('Overview')
            expect(res.text).toContain('Adjustments')
            expect(res.text).toContain('Release dates and calculations')
          })
      },
    )

    it('should not render immigration detention section if it is toggle off, even if the user has the role', () => {
      app = appWithAllRoutes({
        services: defaultServices,
        userSupplier: () => userWithImmigrationDetentionAccess,
      })
      app.locals.immigrationDetentionEnabled = false
      config.applications.immigrationDetention.url = 'http://localhost:9005/immigration-detention'

      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          const immigrationDetentionTitle = $('[data-qa=immigration-detention-header]')
          expect(immigrationDetentionTitle.length).toBe(0)
          expect(res.text).toContain('Overview')
          expect(res.text).toContain('Adjustments')
          expect(res.text).toContain('Release dates and calculations')
        })
    })

    it('displays the "prisoner released" banner when the prisoner is inactive OUT and the user has the required access to view inactive bookings', async () => {
      app = appWithAllRoutes({
        services: defaultServices,
        userSupplier: () => {
          return { ...user, hasInactiveBookingAccess: true, hasAdjustmentsAccess: true }
        },
      })
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        imprisonmentStatusDescription: 'Life imprisonment',
        prisonId: 'OUT',
      } as Prisoner)
      prisonerService.getStartOfSentenceEnvelope.mockResolvedValue(new Date())
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('This person has been released')
          expect(res.text).toContain('Some information may be hidden')
        })
    })

    it('displays the "prisoner released" banner when the prisoner is inactive TRN (transferred) and the user has the required access to view inactive bookings', async () => {
      app = appWithAllRoutes({
        services: {
          prisonerService,
          prisonerSearchService,
          adjustmentsService,
          calculateReleaseDatesService,
          remandAndSentencingService,
        },
        userSupplier: () => {
          return { ...user, hasInactiveBookingAccess: true, hasAdjustmentsAccess: true }
        },
      })
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        imprisonmentStatusDescription: 'Life imprisonment',
        prisonId: 'TRN',
      } as Prisoner)
      prisonerService.getStartOfSentenceEnvelope.mockResolvedValue(new Date())
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('This person has been transferred')
          expect(res.text).toContain('Some information may be hidden')
        })
    })

    it('displays an error page when the prisoner is inactive and the user lacks access to view inactive bookings', () => {
      app = appWithAllRoutes({
        services: {
          prisonerService,
          prisonerSearchService,
          adjustmentsService,
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
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('The details for this person cannot be found')
        })
    })
  })

  describe('Next Court Hearing tests', () => {
    it('should render next-court-hearing section when all details are populated', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({
        caseReference: 'TS0001',
        startTime: '2025-02-08T15:55:54',
        courtLocation: 'The Old Bailey',
        courtEventType: 'Court Appearance',
      } as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Next court hearing</h2>')
          expect(res.text).toMatch(/Case reference\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*TS0001/)
          expect(res.text).toMatch(/Location\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*The Old Bailey/)
          expect(res.text).toMatch(/Hearing type\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*Court Appearance/)
          expect(res.text).toMatch(
            /Date\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*Saturday, 08 February 2025 at 15:55/,
          )
          expect(res.text).not.toContain('There are no upcoming court hearings')
        })
    })

    it('should render next-court-hearing section correctly with no case reference', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({
        startTime: '2025-02-08T15:55:54',
        courtLocation: 'The Old Bailey',
        courtEventType: 'Court Appearance',
      } as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toMatch(/Case reference\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*Not entered/)
        })
    })

    it('should render next-court-hearing section correctly if no court hearing', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Next court hearing</h2>')
          expect(res.text).toContain('There are no upcoming court hearings')
        })
    })
  })

  describe('Adjustments tests for overview', () => {
    it('should render adjustments section correctly if no adjustments', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)
      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Adjustments</h2>')
          expect(res.text).toContain('There are no active adjustments for Jane Doe')
          expect(res.text).toContain('<h1 class="govuk-heading-xl">Overview</h1>')
        })
    })

    it('should render adjustments section correctly when there are adjustments', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([
        {
          adjustmentType: 'REMAND',
          adjustmentTypeText: 'Remand',
          adjustmentArithmeticType: 'DEDUCTION',
          days: 5,
          effectiveDays: 2,
        } as Adjustment,
        {
          adjustmentType: 'REMAND',
          adjustmentTypeText: 'Remand',
          adjustmentArithmeticType: 'DEDUCTION',
          days: 10,
          effectiveDays: 2,
        } as Adjustment,
        {
          adjustmentType: 'UNLAWFULLY_AT_LARGE',
          adjustmentTypeText: 'UAL',
          adjustmentArithmeticType: 'ADDITION',
          days: 6,
        } as Adjustment,
        {
          adjustmentType: 'RESTORATION_OF_ADDITIONAL_DAYS_AWARDED',
          adjustmentTypeText: 'RADA',
          adjustmentArithmeticType: 'DEDUCTION',
          days: 1,
        } as Adjustment,
        {
          adjustmentType: 'TAGGED_BAIL',
          adjustmentTypeText: 'Tagged bail',
          adjustmentArithmeticType: 'DEDUCTION',
          days: 0,
        } as Adjustment,
        {
          adjustmentType: 'UNUSED_DEDUCTIONS',
          adjustmentTypeText: 'Unused deductions',
          adjustmentArithmeticType: 'NONE',
          days: 5,
        } as Adjustment,
      ])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)
      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Adjustments</h2>')
          expect(res.text).toContain('<h3 class="govuk-heading-m">Additions</h3>')
          expect(res.text).toContain('<h3 class="govuk-heading-m">Deductions</h3>')
          expect(res.text).toMatch(
            /Remand\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*15 Days including 11 days unused/,
          )
          expect(res.text).toMatch(/UAL\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*6 Days/)
          expect(res.text).toMatch(/RADA\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*1 Day/)
          expect(res.text).not.toMatch(/Tagged bail\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*0 Days/)
          expect(res.text).not.toContain('There are no active adjustments for Jane Doe')
        })
    })

    it('do not include special remission or lawfully at large adjustments', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([
        {
          adjustmentType: 'LAWFULLY_AT_LARGE',
          adjustmentTypeText: 'Lawfully at large',
          adjustmentArithmeticType: 'NONE',
          days: 5,
        } as Adjustment,
        {
          adjustmentType: 'SPECIAL_REMISSION',
          adjustmentTypeText: 'Special remission',
          adjustmentArithmeticType: 'NONE',
          days: 10,
        } as Adjustment,
      ])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)
      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Adjustments</h2>')
          expect(res.text).toContain('There are no active adjustments for Jane Doe')
        })
    })
  })

  describe('Release dates', () => {
    it('should render release dates section correctly when no active sentences', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      calculateReleaseDatesService.getLatestCalculationForPrisoner.mockResolvedValue(undefined)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Release dates</h2>')
          expect(res.text).toContain('<h1 class="govuk-heading-xl">Overview</h1>')
          expect(res.text).not.toContain('<div class="govuk-summary-card latest-calculation-card">')
          expect(res.text).toContain('This person has no active sentences.')
          const $ = cheerio.load(res.text)
          const noActiveSentencesTryAgainLink = $('[data-qa=try-again-no-active-sentences-link]').first()

          expect(noActiveSentencesTryAgainLink.attr('href')).toStrictEqual('.')
        })
    })

    it('should render release dates section correctly when no latest calculation', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      calculateReleaseDatesService.getLatestCalculationForPrisoner.mockResolvedValue(undefined)
      prisonerService.hasActiveSentences.mockResolvedValue(true)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Release dates</h2>')
          expect(res.text).toContain('<h1 class="govuk-heading-xl">Overview</h1>')
          expect(res.text).not.toContain('<div class="govuk-summary-card latest-calculation-card">')
          expect(res.text).not.toContain('This person has no active sentences.')
        })
    })

    it('should render the latest calculation component when there is a latest calculation', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      calculateReleaseDatesService.getLatestCalculationForPrisoner.mockResolvedValue({
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
      })
      prisonerService.hasActiveSentences.mockResolvedValue(true)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Release dates</h2>')
          expect(res.text).toContain('<h1 class="govuk-heading-xl">Overview</h1>')
          expect(res.text).toContain('<div class="govuk-summary-card latest-calculation-card">')
          expect(res.text).not.toContain('This person has no active sentences.')
        })
    })

    it('should render the latest calculation component when there is a latest calculation and indeterminate sentences exist', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      calculateReleaseDatesService.getLatestCalculationForPrisoner.mockResolvedValue({
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
      })
      calculateReleaseDatesService.hasIndeterminateSentences.mockResolvedValue(true)
      prisonerService.hasActiveSentences.mockResolvedValue(true)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Release dates</h2>')
          expect(res.text).toContain('<h1 class="govuk-heading-xl">Overview</h1>')
          expect(res.text).toContain('<div class="govuk-summary-card latest-calculation-card">')
          expect(res.text).not.toContain(
            'This person is serving an indeterminate sentence and has no calculated dates.',
          )
          expect(res.text).not.toContain('This person has no active sentences.')
        })
    })

    it('should render indeterminate sentences and release dates section correctly when indeterminate sentences exist and no calculated dates exist', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      calculateReleaseDatesService.hasIndeterminateSentences.mockResolvedValue(true)
      prisonerService.hasActiveSentences.mockResolvedValue(true)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const manualCalcLink = $('[data-qa=manual-calc-link]').first()

          expect(manualCalcLink.attr('href')).toStrictEqual('http://127.0.0.1:3000/crds/calculation/A12345B/reason')
          expect(res.text).toContain('<h2 class="govuk-heading-l">Release dates</h2>')
          expect(res.text).toContain('<h1 class="govuk-heading-xl">Overview</h1>')
          expect(res.text).not.toContain('<div class="govuk-summary-card latest-calculation-card">')
          expect(res.text).toContain('This person is serving an indeterminate sentence and has no calculated dates.')
        })
    })

    it('should render indeterminate sentences and release dates section correctly when no indeterminate sentences exist', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      calculateReleaseDatesService.hasIndeterminateSentences.mockResolvedValue(false)
      prisonerService.hasActiveSentences.mockResolvedValue(true)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Release dates</h2>')
          expect(res.text).toContain('<h1 class="govuk-heading-xl">Overview</h1>')
          expect(res.text).not.toContain('<div class="govuk-summary-card latest-calculation-card">')
          expect(res.text).not.toContain(
            'This person is serving an indeterminate sentence and has no calculated dates.',
          )
        })
    })
  })

  describe('Config section', () => {
    it('Config section not visible without the correct role', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).not.toContain('Configuration')
          expect(res.text).not.toContain('<a href="/config">Configure Nomis read only screens</a>')
        })
    })
    it('Config section visible when the user has the correct role', () => {
      app = appWithAllRoutes({
        services: defaultServices,
        userSupplier: () => {
          return { ...user, hasReadOnlyNomisConfigAccess: true, hasAdjustmentsAccess: true }
        },
      })
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('Configuration')
          expect(res.text).toContain('<a href="/config">Configure Nomis read only screens</a>')
        })
    })
  })

  describe('Recalls section', () => {
    it('should set the correct href for the "Record a recall" button when no recalls exist', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          const recordRecallButton = $('[data-qa=create-new-recall-btn]')
          expect(recordRecallButton.attr('href')).toEqual(
            `${config.applications.recordARecall.url}/person/A12345B/recall/create/start?entrypoint=ccards`,
          )
        })
    })

    it('should display UAL when latest recall has a UAL value and is not from NOMIS', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)

      remandAndSentencingService.getMostRecentRecall.mockResolvedValue({
        source: 'DPS',
        createdAt: '2024-01-01',
        recallType: RecallTypes.STANDARD_RECALL,
        location: 'LDS',
        revocationDate: '2024-01-05',
        returnToCustodyDate: new Date('2024-01-10'),
        ual: 5,
      } as Recall)
      prisonService.getPrisonName.mockResolvedValue('Leeds')

      const res = await request(app).get('/prisoner/A12345B/overview').expect(200).expect('Content-Type', /html/)

      const $ = cheerio.load(res.text)

      const ualValue = $('[data-qa="recall-ual"]').text().trim()
      expect(ualValue).toBe('5 days')
    })

    it('should display a "View UAL details" link for NOMIS recalls', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)

      remandAndSentencingService.getMostRecentRecall.mockResolvedValue({
        source: 'NOMIS',
        createdAt: '2024-01-01',
        recallType: RecallTypes.STANDARD_RECALL,
        location: 'LDS',
        revocationDate: '2024-01-05',
        returnToCustodyDate: new Date('2024-01-10'),
      } as Recall)
      prisonService.getPrisonName.mockResolvedValue('Leeds')

      const res = await request(app).get('/prisoner/A12345B/overview').expect(200).expect('Content-Type', /html/)

      const $ = cheerio.load(res.text)

      const ualLink = $('[data-qa="recall-ual"] a')

      expect(ualLink.text().trim()).toBe('View UAL details')
      expect(ualLink.attr('href')).toBe(`${config.applications.adjustments.url}/A12345B`)
    })

    it('Should not show heading when source is NOMIS', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getMostRecentRecall.mockResolvedValue({
        source: 'NOMIS',
        createdAt: '2024-01-01',
        recallType: RecallTypes.STANDARD_RECALL,
        location: 'LDS',
        revocationDate: '2024-01-05',
        returnToCustodyDate: new Date('2024-01-10'),
      } as Recall)
      prisonService.getPrisonName.mockResolvedValue('Leeds')

      const res = await request(app).get('/prisoner/A12345B/overview').expect(200).expect('Content-Type', /html/)

      const $ = cheerio.load(res.text)

      expect($('[data-qa=recall-card-title]')).toHaveLength(0)
    })

    it('Should show heading when source is DPS', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      adjustmentsService.getAdjustments.mockResolvedValue([])
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      remandAndSentencingService.getMostRecentRecall.mockResolvedValue({
        source: 'DPS',
        createdAt: '2024-01-01',
        recallType: RecallTypes.STANDARD_RECALL,
        location: 'LDS',
        revocationDate: '2024-01-05',
        returnToCustodyDate: new Date('2024-01-10'),
      } as Recall)
      prisonService.getPrisonName.mockResolvedValue('Leeds')

      const res = await request(app).get('/prisoner/A12345B/overview').expect(200).expect('Content-Type', /html/)

      const $ = cheerio.load(res.text)

      expect($('[data-qa=recall-card-title]').text().trim()).toBe('Recorded on 01 January 2024')
    })

    describe('arrest date display', () => {
      beforeEach(() => {
        prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
          prisonerNumber: 'A12345B',
          prisonId: 'MDI',
        } as Prisoner)
        adjustmentsService.getAdjustments.mockResolvedValue([])
        prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      })

      test.each([
        {
          name: 'shows formatted rtc date when returnToCustodyDate exists (inPrison false)',
          returnToCustodyDate: new Date('2024-01-10'),
          inPrisonOnRevocationDate: false,
          expected: '10 January 2024',
        },
        {
          name: 'shows formatted rtc date when returnToCustodyDate exists (inPrison null)',
          returnToCustodyDate: new Date('2024-01-10'),
          inPrisonOnRevocationDate: null,
          expected: '10 January 2024',
        },
        {
          name: 'shows In prison at recall when inPrison true',
          returnToCustodyDate: null,
          inPrisonOnRevocationDate: true,
          expected: 'In prison at recall',
        },
        {
          name: 'shows Not entered when rtc date missing and inPrison false',
          expected: 'Not entered',
        },
      ])('$name', async ({ returnToCustodyDate, inPrisonOnRevocationDate, expected }) => {
        remandAndSentencingService.getMostRecentRecall.mockResolvedValue({
          recallType: RecallTypes.STANDARD_RECALL,
          revocationDate: '2024-01-05',
          returnToCustodyDate,
          inPrisonOnRevocationDate,
        } as Recall)

        const res = await request(app).get('/prisoner/A12345B/overview').expect(200).expect('Content-Type', /html/)

        const $ = cheerio.load(res.text)
        const arrestDate = $('[data-qa="arrest-date"]').text().trim()

        expect(arrestDate).toBe(expected)
      })
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
  },
} as CcrdServiceDefinitions
