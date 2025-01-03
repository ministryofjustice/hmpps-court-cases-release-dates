import { Express } from 'express'

import request from 'supertest'
import * as cheerio from 'cheerio'
import PrisonerService from '../../../services/prisonerService'
import { appWithAllRoutes, user } from '../../testutils/appSetup'
import { Prisoner } from '../../../@types/prisonerSearchApi/types'
import PrisonerSearchService from '../../../services/prisonerSearchService'
import { CourtEventDetails } from '../../../@types/prisonApi/types'
import AdjustmentsService from '../../../services/adjustmentsService'
import { AdaIntercept, Adjustment } from '../../../@types/adjustmentsApi/types'
import config from '../../../config'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { ThingsToDo } from '../../../@types/courtCasesReleaseDatesApi/types'

jest.mock('../../../services/prisonerService')
jest.mock('../../../services/prisonerSearchService')
jest.mock('../../../services/adjustmentsService')
jest.mock('../../../services/calculateReleaseDatesService')

const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>
const adjustmentsService = new AdjustmentsService(null) as jest.Mocked<AdjustmentsService>
const calculateReleaseDatesService = new CalculateReleaseDatesService() as jest.Mocked<CalculateReleaseDatesService>

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      prisonerService,
      prisonerSearchService,
      adjustmentsService,
      calculateReleaseDatesService,
    },
    userSupplier: () => {
      return { ...user, hasAdjustmentsAccess: true }
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

      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('Overview')
          expect(res.text).toContain('Adjustments')
          expect(res.text).toContain('Release dates and calculations')
        })
    })

    it('displays the "prisoner released" banner when the prisoner is inactive OUT and the user has the required access to view inactive bookings', async () => {
      app = appWithAllRoutes({
        services: {
          prisonerService,
          prisonerSearchService,
          adjustmentsService,
          calculateReleaseDatesService,
        },
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
          adjustmentTypeText: 'Remand',
          adjustmentArithmeticType: 'DEDUCTION',
          days: 5,
        } as Adjustment,
        {
          adjustmentTypeText: 'Remand',
          adjustmentArithmeticType: 'DEDUCTION',
          days: 10,
        } as Adjustment,
        {
          adjustmentTypeText: 'UAL',
          adjustmentArithmeticType: 'ADDITION',
          days: 6,
        } as Adjustment,
        {
          adjustmentTypeText: 'RADA',
          adjustmentArithmeticType: 'DEDUCTION',
          days: 1,
        } as Adjustment,
        {
          adjustmentTypeText: 'Tagged bail',
          adjustmentArithmeticType: 'DEDUCTION',
          days: 0,
        } as Adjustment,
        {
          adjustmentTypeText: 'Unused deductions',
          adjustmentArithmeticType: 'NONE',
          days: 5,
        } as Adjustment,
      ])
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Adjustments</h2>')
          expect(res.text).toContain('<h3 class="govuk-heading-m">Additions</h3>')
          expect(res.text).toContain('<h3 class="govuk-heading-m">Deductions</h3>')
          expect(res.text).toMatch(/Remand\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*15 Days/)
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
      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('<h2 class="govuk-heading-l">Adjustments</h2>')
          expect(res.text).toContain('There are no active adjustments for Jane Doe')
        })
    })
  })

  describe('Things To Do (notification) tests', () => {
    describe('Adjustment intercept tests', () => {
      it('should display correct message if intercept type is UPDATE', () => {
        prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
          prisonerNumber: 'A12345B',
          firstName: 'Jane',
          lastName: 'Doe',
          prisonId: 'MDI',
        } as Prisoner)
        prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
        adjustmentsService.getAdjustments.mockResolvedValue([])
        prisonerService.hasActiveSentences.mockResolvedValue(true)
        prisonerService.getThingsToDo.mockResolvedValue({
          hasCalculationThingsToDo: false,
          hasAdjustmentThingsToDo: true,
          calculationThingsToDo: [],
          adjustmentThingsToDo: { adaIntercept: { type: 'UPDATE' } as AdaIntercept },
        } as ThingsToDo)

        return request(app)
          .get('/prisoner/A12345B/overview')
          .expect('Content-Type', /html/)
          .expect(res => {
            expect(res.text).toContain('The ADA information needs to be reviewed')
            expect(res.text).toContain('Review updated ADA information')
          })
      })

      it('should display correct message if intercept type is FIRST_TIME', () => {
        prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
          prisonerNumber: 'A12345B',
          firstName: 'Jane',
          lastName: 'Doe',
          prisonId: 'MDI',
        } as Prisoner)
        prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
        adjustmentsService.getAdjustments.mockResolvedValue([])
        prisonerService.hasActiveSentences.mockResolvedValue(true)
        prisonerService.getThingsToDo.mockResolvedValue({
          hasCalculationThingsToDo: false,
          hasAdjustmentThingsToDo: true,
          calculationThingsToDo: [],
          adjustmentThingsToDo: { adaIntercept: { type: 'FIRST_TIME' } as AdaIntercept },
        } as ThingsToDo)

        return request(app)
          .get('/prisoner/A12345B/overview')
          .expect('Content-Type', /html/)
          .expect(res => {
            expect(res.text).toContain('The ADA information needs to be reviewed')
            expect(res.text).toContain('Review ADA information')
          })
      })

      it('should display correct message if intercept type is PADA', () => {
        prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
          prisonerNumber: 'A12345B',
          firstName: 'Jane',
          lastName: 'Doe',
          prisonId: 'MDI',
        } as Prisoner)
        prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
        adjustmentsService.getAdjustments.mockResolvedValue([])
        prisonerService.hasActiveSentences.mockResolvedValue(true)
        prisonerService.getThingsToDo.mockResolvedValue({
          hasCalculationThingsToDo: false,
          hasAdjustmentThingsToDo: true,
          calculationThingsToDo: [],
          adjustmentThingsToDo: { adaIntercept: { type: 'PADA' } as AdaIntercept },
        } as ThingsToDo)

        return request(app)
          .get('/prisoner/A12345B/overview')
          .expect('Content-Type', /html/)
          .expect(res => {
            expect(res.text).toContain('The ADA information needs to be reviewed')
            expect(res.text).toContain('Review prospective ADA information')
          })
      })
    })
  })

  describe('Authorisation tests', () => {
    it('must redirect when user does not have access to adjustments', () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        imprisonmentStatusDescription: 'Life imprisonment',
        prisonId: 'MDI',
      } as Prisoner)
      app = appWithAllRoutes({
        services: {
          prisonerService,
          prisonerSearchService,
          adjustmentsService,
        },
        userSupplier: () => {
          return { ...user, hasAdjustmentsAccess: false }
        },
      })
      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect(302)
        .expect('Location', `${config.applications.calculateReleaseDates.url}?prisonId=A12345B`)
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

  describe('Displaying of adjustments section tests', () => {
    it('Do not show adjustments section if prisoner is OUT', () => {
      app = appWithAllRoutes({
        services: {
          prisonerService,
          prisonerSearchService,
          adjustmentsService,
          calculateReleaseDatesService,
        },
        userSupplier: () => {
          return { ...user, hasInactiveBookingAccess: true, hasAdjustmentsAccess: true }
        },
      })
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        firstName: 'Jane',
        lastName: 'Doe',
        prisonId: 'OUT',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('This person has been released')
          expect(res.text).toContain('Some information may be hidden')
          expect(res.text).toContain(
            '<a class="moj-sub-navigation__link"  href="https://adjust-release-dates.hmpps.service.justice.gov.uk/A12345B">Adjustments</a>',
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
        services: {
          prisonerService,
          prisonerSearchService,
          adjustmentsService,
          calculateReleaseDatesService,
        },
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
      return request(app)
        .get('/prisoner/A12345B/overview')
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('Configuration')
          expect(res.text).toContain('<a href="/config">Configure Nomis read only screens</a>')
        })
    })
  })
})
