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
import {
  ImmigrationDetention,
  Recall,
  RecallTypes,
  SearchCourtCasesPage,
  SentenceConsecutiveToDetailsResponse,
} from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import ImmigrationDetentionService from '../../../services/ImmigrationDetentionService'
import config from '../../../config'

jest.mock('../../../services/prisonerService')
jest.mock('../../../services/prisonerSearchService')
jest.mock('../../../services/calculateReleaseDatesService')
jest.mock('../../../services/remandAndSentencingService')
jest.mock('../../../services/courtRegisterService')
jest.mock('../../../services/manageOffencesService')
jest.mock('../../../services/ImmigrationDetentionService')

const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>
const calculateReleaseDatesService = new CalculateReleaseDatesService() as jest.Mocked<CalculateReleaseDatesService>
const remandAndSentencingService = new RemandAndSentencingService(null) as jest.Mocked<RemandAndSentencingService>
const prisonService = new PrisonService(null) as jest.Mocked<PrisonService>
const courtRegisterService = new CourtRegisterService(null) as jest.Mocked<CourtRegisterService>
const manageOffencesService = new ManageOffencesService(null) as jest.Mocked<ManageOffencesService>
const immigrationDetentionService = new ImmigrationDetentionService() as jest.Mocked<ImmigrationDetentionService>

let app: Express

const defaultServices = {
  prisonService,
  prisonerService,
  prisonerSearchService,
  calculateReleaseDatesService,
  remandAndSentencingService,
  courtRegisterService,
  manageOffencesService,
  immigrationDetentionService,
}

const defaultUser = { ...user, hasAdjustmentsAccess: true, hasRasAccess: true, hasRecallsAccess: true }
const userWithImmigrationDetentionAccess = { ...defaultUser, hasImmigrationDetentionAccess: true }

const defaultCourtCasesPage: SearchCourtCasesPage = {
  content: [
    {
      prisonerId: '',
      courtCaseUuid: '724e5b2c-2754-4455-b356-f4e2c2b3bc74',
      courtCaseStatus: 'ACTIVE',
      latestCourtAppearance: {
        appearanceUuid: '',
        criminalAppealOfficeReference: '',
        courtCode: 'B10JQ',
        outcome: 'Imprisonment',
        warrantDate: '',
        warrantType: '',
        convictionDate: '',
        charges: [
          {
            chargeUuid: 'charge-uuid-1',
            offenceCode: 'CJ88001',
            offenceStartDate: '2023-12-12',
            aggravatingFactors: [
              {
                code: 'OATC',
                title: 'Offence Aggravated by Terrorist Connection',
                description: 'Offence Aggravated by Terrorist Connection',
                displayOrder: 20,
              },
            ],
            outcome: { outcomeUuid: 'outcome-1', outcomeName: 'Imprisonment' },
            sentence: {
              sentenceUuid: 'sent-uuid-1',
              chargeNumber: '3',
              consecutiveToSentenceUuid: 'sentence-uuid-1',
              convictionDate: '2024-01-01',
              periodLengths: [
                {
                  periodLengthUuid: 'period-uuid-1',
                  years: 1,
                  months: 1,
                  weeks: 1,
                  days: 1,
                  order: 'years,months,weeks,days',
                  type: 'SENTENCE_LENGTH',
                },
              ],
              sentenceServeType: 'CONSECUTIVE',
              sentenceType: {
                sentenceTypeUuid: 'sentence-type-uuid-1',
                description: 'Standard',
                classification: 'STANDARD',
              },
              legacyData: {
                sentenceCalcType: '',
                sentenceCategory: '',
                sentenceTypeDesc: '',
                postedDate: '',
                active: true,
                nomisLineReference: '',
                bookingId: 123456,
              },
              fineAmount: 323,
              hasRecall: false,
            },
            legacyData: { offenceDescription: 'Common assault' },
            createdAt: '2024-01-01T00:00:00',
          },
        ],
      },
      appearanceCount: 1,
      caseReferences: [],
      firstDayInCustody: '',
      mergedFromCases: [],
      allAppearancesHaveRecall: false,
      firstDayInCustodyWarrantType: '',
      canAppeal: false,
      canBreach: false,
      overallSentenceLength: {
        periodLengthUuid: 'period-uuid-1',
        years: 1,
        months: 1,
        weeks: 1,
        days: 1,
        order: 'years,months,weeks,days',
        type: 'SENTENCE_LENGTH',
      },
    },
  ],
  prisonerCourtCaseTotal: 1,
}

beforeEach(() => {
  app = appWithAllRoutes({
    services: defaultServices,
    userSupplier: () => {
      return defaultUser
    },
  })

  remandAndSentencingService.searchCourtCases.mockResolvedValue(defaultCourtCasesPage as SearchCourtCasesPage)
  remandAndSentencingService.getConsecutiveToDetails.mockResolvedValue({
    sentences: [
      {
        sentenceUuid: 'sentence-uuid-1',
        offenceCode: 'CJ88117',
        chargeLegacyData: { offenceDescription: 'Possess knife blade or sharp pointed article' },
      },
    ],
  } as SentenceConsecutiveToDetailsResponse)

  courtRegisterService.getCourtMap.mockResolvedValue({ B10JQ: 'Cambridge Magistrates Court' } as {
    [p: string]: string
  })
  manageOffencesService.getOffenceMap.mockResolvedValue({
    CJ88001: 'CJ88001 Common assault',
    CJ88117: 'CJ88117 Possess knife blade or sharp pointed article',
  } as { [p: string]: string })
  immigrationDetentionService.getImmigrationDetentionMessage.mockReturnValue(
    'There are no immigration documents recorded.',
  )
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Route Handlers - Readonly Overview', () => {
  describe('Page layout', () => {
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
  })

  describe('Did you find what you need panel', () => {
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
          const $ = cheerio.load(res.text)
          expect($('a:contains("Give feedback")').first().attr('href')).toBe(config.externalUrls.feedbackSurvey.url)
          expect(res.text).toContain('Did you find what you need?')
          expect(res.text).toContain(
            'This is a new service. To make it the best it can be, your feedback is essential.',
          )
          expect(res.text).toContain('Give feedback')
        })
    })
  })

  describe('Release date summary overview box section', () => {
    const latestCalculationWithMultipleDates: LatestCalculationCardConfig = {
      calculatedAt: '2024-06-01T10:30:45',
      establishment: 'HMP Kirkham',
      reason: 'Transfer check',
      source: 'CRDS',
      dates: [
        { type: 'SLED', description: 'Sentence and licence expiry date', date: '2024-06-15', hints: [] },
        { type: 'CRD', description: 'Conditional release date', date: '2024-02-21', hints: [] },
        { type: 'HDCED', description: 'Home detention curfew eligibility date', date: '2024-01-10', hints: [] },
        { type: 'TUSED', description: 'Top-up supervision end date', date: '2025-01-10', hints: [] },
      ],
    }

    it('should display SLED, CRD, HDCED and TUSED when present in the latest calculation', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(true)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      calculateReleaseDatesService.getLatestCalculationForPrisoner.mockResolvedValue(latestCalculationWithMultipleDates)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(res.text).toContain('Sentence and licence expiry date')
      expect(res.text).toContain('Conditional release date')
      expect(res.text).toContain('Home detention curfew eligibility date')
      expect(res.text).toContain('Top-up supervision end date')
    })

    it('should not display a release date type that is not present in the latest calculation', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(true)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      // fixture 'latestCalculation' only contains a CRD
      calculateReleaseDatesService.getLatestCalculationForPrisoner.mockResolvedValue(latestCalculation)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(res.text).toContain('Conditional release date')
      expect(res.text).not.toContain('Top-up supervision end date')
      expect(res.text).not.toContain('Home detention curfew eligibility date')
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
          expect(res.text).toContain('What do these release dates mean')
        })
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
    it('should not fetch the latest calculation when there are no active sentences', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)

      await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(calculateReleaseDatesService.getLatestCalculationForPrisoner).not.toHaveBeenCalled()
    })
    it('should fetch the latest calculation when there are active sentences', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(true)
      calculateReleaseDatesService.getLatestCalculationForPrisoner.mockResolvedValue(latestCalculation)

      await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(calculateReleaseDatesService.getLatestCalculationForPrisoner).toHaveBeenCalledWith(
        'A12345B',
        defaultUser.token,
      )
    })

    it('should open the release date definitions link in a new browser tab', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)
      prisonerService.hasActiveSentences.mockResolvedValue(true)
      prisonerService.getServiceDefinitions.mockResolvedValue(serviceDefinitionsNoThingsToDo)
      calculateReleaseDatesService.getLatestCalculationForPrisoner.mockResolvedValue(latestCalculation)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      const $ = cheerio.load(res.text)
      expect($('[data-qa=release-date-definitions-link]').first().attr('target')).toBe('_blank')
    })
  })

  describe('Court cases summary card section', () => {
    it('should display the court case reference and court name in the card title', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      remandAndSentencingService.searchCourtCases.mockResolvedValue({
        content: [
          {
            courtCaseUuid: 'cc-ref-1',
            courtCaseStatus: 'ACTIVE',
            latestCourtAppearance: {
              courtCode: 'B10JQ',
              caseReference: 'REF-123',
              outcome: 'Imprisonment',
              charges: [],
            },
          },
        ],
      } as SearchCourtCasesPage)
      remandAndSentencingService.getConsecutiveToDetails.mockResolvedValue({
        sentences: [],
      } as SentenceConsecutiveToDetailsResponse)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(res.text).toContain('REF-123 at Cambridge Magistrates Court')
    })

    it('should display an "Inactive" status tag for an inactive court case', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      remandAndSentencingService.searchCourtCases.mockResolvedValue({
        content: [
          {
            courtCaseUuid: 'cc-inactive-1',
            courtCaseStatus: 'INACTIVE',
            latestCourtAppearance: {
              courtCode: 'B10JQ',
              outcome: 'Imprisonment',
              charges: [],
            },
          },
        ],
      } as SearchCourtCasesPage)
      remandAndSentencingService.getConsecutiveToDetails.mockResolvedValue({
        sentences: [],
      } as SentenceConsecutiveToDetailsResponse)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      const $ = cheerio.load(res.text)
      expect($('[data-qa="courtCaseCard-cc-inactive-1"]').text()).toContain('Inactive')
    })

    it('should not display an "Inactive" status tag for an active court case', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)

      // default fixture court case is ACTIVE
      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      const $ = cheerio.load(res.text)
      expect($('[data-qa="courtCaseCard-724e5b2c-2754-4455-b356-f4e2c2b3bc74"]').text()).not.toContain('Inactive')
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
        0,
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

    it('should show offences and sentence details', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(res.text).toContain('Count 3')
      expect(res.text).toContain('Common assault')
      expect(res.text).toContain('Committed on')
      expect(res.text).toContain('12/12/2023')
      expect(res.text).toContain('Conviction date')
      expect(res.text).toContain('01/01/2024')
      expect(res.text).toContain('Outcome')
      expect(res.text).toContain('Imprisonment')
      expect(res.text).toContain('Sentence type')
      expect(res.text).toContain('Standard')
      expect(res.text).toContain('Sentence length')
      expect(res.text).toContain('1 years 1 months 1 weeks 1 days')
      expect(res.text).toContain('Consecutive or concurrent')
      expect(res.text).toContain('Consecutive')
      expect(res.text).toContain('Aggravating factors')
      expect(res.text).toContain('Offence Aggravated by Terrorist Connection')
    })

    it('should handle an empty court cases page and still render', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      remandAndSentencingService.searchCourtCases.mockResolvedValue({ content: [] } as SearchCourtCasesPage)
      remandAndSentencingService.getConsecutiveToDetails.mockResolvedValue({
        sentences: [],
      } as SentenceConsecutiveToDetailsResponse)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(res.text).not.toContain('data-qa="courtCaseCard-')
      expect(manageOffencesService.getOffenceMap).toHaveBeenCalledWith([], defaultUser.username, [])
      expect(courtRegisterService.getCourtMap).toHaveBeenCalledWith([], defaultUser.username)
      expect(remandAndSentencingService.getConsecutiveToDetails).toHaveBeenCalledWith([], defaultUser.username)
    })

    it('should de-duplicate court codes and offence codes across court cases', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      remandAndSentencingService.searchCourtCases.mockResolvedValue({
        content: [
          {
            courtCaseUuid: 'cc-1',
            latestCourtAppearance: {
              courtCode: 'B10JQ',
              charges: [
                { chargeUuid: 'c1', offenceCode: 'CJ88001', legacyData: { offenceDescription: 'Common assault' } },
              ],
            },
          },
          {
            courtCaseUuid: 'cc-2',
            latestCourtAppearance: {
              courtCode: 'B10JQ',
              charges: [
                { chargeUuid: 'c2', offenceCode: 'CJ88001', legacyData: { offenceDescription: 'Common assault' } },
              ],
            },
          },
        ],
      } as SearchCourtCasesPage)
      remandAndSentencingService.getConsecutiveToDetails.mockResolvedValue({
        sentences: [],
      } as SentenceConsecutiveToDetailsResponse)

      await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(courtRegisterService.getCourtMap).toHaveBeenCalledWith(['B10JQ'], defaultUser.username)
      const offenceCodesArg = manageOffencesService.getOffenceMap.mock.calls[0][0]
      expect(offenceCodesArg).toEqual(['CJ88001'])
    })
  })

  describe('Immigration documents section', () => {
    it('should not render immigration documents section when user lacks access', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      const $ = cheerio.load(res.text)
      expect($('[data-qa=immigration-detention-header]').length).toBe(0)
      expect($('[data-qa=immigration-detention-message]').length).toBe(0)
      expect(remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner).not.toHaveBeenCalled()
    })

    it('should render immigration documents section when user has access', async () => {
      app = appWithAllRoutes({
        services: defaultServices,
        userSupplier: () => userWithImmigrationDetentionAccess,
      })
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(undefined)
      immigrationDetentionService.getImmigrationDetentionMessage.mockReturnValue(
        'There are no immigration documents recorded.',
      )

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      const $ = cheerio.load(res.text)
      expect($('[data-qa=immigration-detention-header]').first().text().trim()).toBe('Immigration documents')
      expect($('[data-qa=immigration-detention-message]').first().text().trim()).toBe(
        'There are no immigration documents recorded.',
      )
      expect(remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner).toHaveBeenCalledWith(
        'A12345B',
        defaultUser.username,
      )
    })

    it('should render the immigration message for an existing record', async () => {
      app = appWithAllRoutes({
        services: defaultServices,
        userSupplier: () => userWithImmigrationDetentionAccess,
      })
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner.mockResolvedValue(
        immigrationDetentionRecord,
      )
      immigrationDetentionService.getImmigrationDetentionMessage.mockReturnValue(
        'IS91 Detention Authority dated 22 June 2022',
      )

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      const $ = cheerio.load(res.text)
      expect($('[data-qa=immigration-detention-message]').first().text().trim()).toBe(
        'IS91 Detention Authority dated 22 June 2022',
      )
    })
  })

  describe('Recalls section', () => {
    it('should render the DPS recall start date and revocation date values', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      remandAndSentencingService.getMostRecentRecall.mockResolvedValue({
        source: 'DPS',
        createdAt: '2024-01-01',
        recallType: RecallTypes.STANDARD_RECALL,
        location: 'LDS',
        revocationDate: '2024-01-05',
        returnToCustodyDate: new Date('2024-01-10'),
      } as Recall)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      // 'date' filter formats as DD MMMM YYYY
      expect(res.text).toContain('05 January 2024') // revocation date
      expect(res.text).toContain('10 January 2024') // arrest date (returnToCustodyDate)
      expect(res.text).not.toContain('Not entered')
    })

    it('should not render recalls section when there is no recall', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      remandAndSentencingService.getMostRecentRecall.mockResolvedValue(undefined)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      const $ = cheerio.load(res.text)
      expect($('#recall-summary').length).toBe(0)
      expect(res.text).not.toContain('Recalls')
    })

    it('should render a DPS recall without the NOMIS badge', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      remandAndSentencingService.getMostRecentRecall.mockResolvedValue({
        source: 'DPS',
        createdAt: '2024-01-01',
        recallType: RecallTypes.STANDARD_RECALL,
        location: 'LDS',
        revocationDate: '2024-01-05',
        returnToCustodyDate: new Date('2024-01-10'),
      } as Recall)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      const $ = cheerio.load(res.text)
      expect($('#recall-summary').length).toBe(1)
      expect($('[data-qa=nomis-badge]').length).toBe(0)
      expect(res.text).toContain('Standard')
    })

    it('should render a NOMIS recall with the NOMIS badge and "Not entered" dates', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      remandAndSentencingService.getMostRecentRecall.mockResolvedValue({
        source: 'NOMIS',
        createdAt: '2024-01-01',
        recallType: RecallTypes.STANDARD_RECALL,
        location: 'LDS',
        revocationDate: '2024-01-05',
        returnToCustodyDate: new Date('2024-01-10'),
      } as Recall)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      const $ = cheerio.load(res.text)
      expect($('[data-qa=nomis-badge]').first().text().trim()).toBe('NOMIS')
      expect(res.text).toContain('Not entered')
    })

    it('should show "In prison at recall" when inPrisonOnRevocationDate is true', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      remandAndSentencingService.getMostRecentRecall.mockResolvedValue({
        source: 'DPS',
        createdAt: '2024-01-01',
        recallType: RecallTypes.STANDARD_RECALL,
        location: 'LDS',
        revocationDate: '2024-01-05',
        inPrisonOnRevocationDate: true,
      } as Recall)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      const $ = cheerio.load(res.text)
      expect($('[data-qa=arrest-date]').first().text().trim()).toBe('In prison at recall')
    })
  })

  describe('Next court hearing section', () => {
    it('should render "no upcoming court hearings" when there is no next event', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getNextCourtEvent.mockResolvedValue({} as CourtEventDetails)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(res.text).toContain('There are no upcoming court hearings')
    })

    it('should render next court hearing details when a next event exists', async () => {
      prisonerSearchService.getByPrisonerNumber.mockResolvedValue({
        prisonerNumber: 'A12345B',
        prisonId: 'MDI',
      } as Prisoner)
      prisonerService.hasActiveSentences.mockResolvedValue(false)
      prisonerService.getNextCourtEvent.mockResolvedValue({
        caseReference: 'CASE-123',
        courtLocation: 'Leeds Crown Court',
        courtEventType: 'Sentencing',
        startTime: '2024-06-01T10:30:00',
      } as CourtEventDetails)

      const res = await request(app).get('/prisoner/A12345B/readonly-overview').expect(200)

      expect(res.text).not.toContain('There are no upcoming court hearings')
      expect(res.text).toContain('CASE-123')
      expect(res.text).toContain('Leeds Crown Court')
      expect(res.text).toContain('Sentencing')
    })
  })

  describe('Permissions', () => {
    it('should display an error page when the prisoner is inactive and the user lacks access to view inactive bookings', () => {
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
  })
})

const serviceDefinitionsNoThingsToDo: CcrdServiceDefinitions = {
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
}

const latestCalculation: LatestCalculationCardConfig = {
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
}

const immigrationDetentionRecord: ImmigrationDetention = {
  immigrationDetentionUuid: 'IMM-DET-UUID-12345',
  courtAppearanceUuid: 'ca-uuid-0001',
  prisonerId: 'A12345B',
  immigrationDetentionRecordType: 'IS91',
  recordDate: '2022-06-22',
  homeOfficeReferenceNumber: 'A12345B',
  noLongerOfInterestReason: 'BRITISH_CITIZEN',
  noLongerOfInterestComment: '',
  createdAt: '2025-11-03T08:06:37.123Z',
  source: 'DPS',
}
