import { Express } from 'express'
import request from 'supertest'
import dayjs from 'dayjs'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import RemandAndSentencingService from '../../services/remandAndSentencingService'
import PrisonService from '../../services/prisonService'
import config from '../../config'
import {
  PrisonCourtDocumentDay,
  PrisonCourtDocumentWeek,
} from '../../@types/courtDataIngestionApi/prisonCourtDocumentTypes'
import { Role, Roles } from '../../@types/roles'
import { HmctsHearingAutopopulateEligibility } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'

jest.mock('../../services/courtDataIngestionService')
jest.mock('../../services/remandAndSentencingService')
jest.mock('../../services/prisonService')

const courtDataIngestionService = new CourtDataIngestionService(null) as jest.Mocked<CourtDataIngestionService>
const remandAndSentencingService = new RemandAndSentencingService(null) as jest.Mocked<RemandAndSentencingService>
const prisonService = new PrisonService(null) as jest.Mocked<PrisonService>

const supportUser: Express.User = {
  ...user,
  roles: [Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)],
  caseLoads: [
    { ...user.caseLoads[0], caseLoadId: 'LEI', description: 'Leeds' },
    { ...user.caseLoads[0], caseLoadId: 'HLI', description: 'Hull' },
  ],
}
const nonSupportUser = { ...user, roles: [Roles.getRole(Role.RELEASE_DATES_CALCULATOR)] }

const appAs = (as: Express.User) =>
  appWithAllRoutes({
    services: { courtDataIngestionService, remandAndSentencingService, prisonService },
    userSupplier: () => as,
  })

let app: Express

const PRISONER = 'A1111AA'
const HEARING = '11111111-1111-1111-1111-111111111111'
const CASE_REFERENCE = '45AA1234567'

const week = (overrides: Partial<PrisonCourtDocumentWeek> = {}): PrisonCourtDocumentWeek => ({
  prisonCode: 'LEI',
  from: '2026-09-07',
  to: '2026-09-13',
  rollSize: 742,
  days: [
    { date: '2026-09-07', documents: 3, people: 2 },
    { date: '2026-09-08', documents: 0, people: 0 },
  ],
  totalDocuments: 3,
  documents: [],
  previousWeek: '2026-08-31',
  nextWeek: undefined,
  ...overrides,
})

const day = (overrides: Partial<PrisonCourtDocumentDay> = {}): PrisonCourtDocumentDay => ({
  prisonCode: 'LEI',
  date: '2026-09-08',
  rollSize: 742,
  hearings: [
    {
      courtHearingId: HEARING,
      prisonerNumber: PRISONER,
      hearingDate: '2026-09-08',
      hearingType: 'First appearance',
      courtName: 'Leeds Crown Court',
      caseReferences: [CASE_REFERENCE],
      receivedAt: '2026-09-08T09:14:00',
      documents: [
        {
          prisonDocumentId: '22222222-2222-2222-2222-222222222222',
          prisonerNumber: PRISONER,
          documentType: 'REMAND_WARRANT',
          caseReferences: [CASE_REFERENCE],
          addressedPrison: 'LEI',
          receivedAt: '2026-09-08T09:14:00',
        },
      ],
    },
  ],
  documentsWithoutAHearing: [],
  people: [{ prisonerNumber: PRISONER, firstName: 'Chappel', lastName: 'House' }],
  ...overrides,
})

const eligibility = {
  prisonerNumber: PRISONER,
  hearingId: HEARING,
  cases: [],
  features: [],
  hasBeenCompleted: false,
  hasWarrantAndPcr: true,
} as HmctsHearingAutopopulateEligibility

beforeEach(() => {
  app = appAs(supportUser)
  prisonService.getAllPrisons.mockResolvedValue([
    { prisonId: 'LEI', prisonName: 'Leeds' },
    { prisonId: 'MDI', prisonName: 'Moorland' },
    { prisonId: 'HLI', prisonName: 'Hull' },
  ] as never)
  prisonService.getPrisonName.mockResolvedValue('Leeds')
  courtDataIngestionService.getPrisonCourtDocumentWeek.mockResolvedValue(week())
  courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(day())
  remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([eligibility])
})

afterEach(() => jest.resetAllMocks())

describe('access', () => {
  const PRISON_ROLES = [Role.CCRD_DOCUMENTS, Role.RAS_DOCUMENT_AUTO, Role.RELEASE_DATES_CALCULATOR]
  const withRoles = (roles: Role[]): Express.User => ({
    ...user,
    roles: roles.map(role => Roles.getRole(role)),
    caseLoads: [{ ...user.caseLoads[0], caseLoadId: 'LEI', description: 'Leeds' }],
  })
  const prisonUser = withRoles(PRISON_ROLES)

  afterEach(() => {
    config.courtDocuments.openToPrisons = false
  })

  it('is refused without the support role', () => {
    return request(appAs(nonSupportUser)).get('/court-documents').expect(302).expect('Location', '/authError')
  })

  it('is refused to prisons until opened to them', () => {
    return request(appAs(prisonUser)).get('/court-documents/LEI').expect(302).expect('Location', '/authError')
  })

  describe('once opened to prisons', () => {
    beforeEach(() => {
      config.courtDocuments.openToPrisons = true
    })
    it.each(PRISON_ROLES)('needs every one of the roles, so refuses anyone missing %s', missing => {
      return request(appAs(withRoles(PRISON_ROLES.filter(role => role !== missing))))
        .get('/court-documents/LEI')
        .expect(302)
        .expect('Location', '/authError')
    })

    it('lets in someone with all of them, with no support detail', async () => {
      const prison = request(appAs(prisonUser))

      const weekPage = await prison.get('/court-documents/LEI').expect(200)
      expect(weekPage.text).not.toContain('Unmatched documents')

      const dayPage = await prison.get('/court-documents/LEI/day?date=2026-09-08').expect(200)
      expect(dayPage.text).toContain('Autocomplete')
      expect(dayPage.text).not.toContain('data-qa="facts"')
      expect(dayPage.text).not.toContain('data-qa="preview-banner"')
    })

    it('still limits them to their caseload', () => {
      return request(appAs(prisonUser))
        .get('/court-documents/MDI')
        .expect(res => expect(res.status).not.toBe(200))
    })

    it('still keeps unmatched documents to the support role', () => {
      return request(appAs(prisonUser)).get('/unmatched-documents').expect(302).expect('Location', '/authError')
    })

    it('still lets support in, with the support detail', () => {
      return request(app)
        .get('/court-documents/LEI/day?date=2026-09-08')
        .expect(200)
        .expect(res => expect(res.text).toContain('data-qa="facts"'))
    })

    it('still refuses someone with neither role', () => {
      return request(appAs(nonSupportUser)).get('/court-documents').expect(302).expect('Location', '/authError')
    })
  })
})

describe('GET /court-documents', () => {
  const prisons = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      prisonId: `P${index.toString().padStart(2, '0')}`,
      prisonName: `Prison ${index}`,
    }))

  it('lists only the prisons in the user caseloads', () => {
    return request(app)
      .get('/court-documents')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Leeds')
        expect(res.text).toContain('Hull')
        expect(res.text).not.toContain('Moorland')
        expect(res.text).toContain('href="/unmatched-documents"')
      })
  })

  it('says in one sentence what the documents are, then asks for a prison', () => {
    return request(app)
      .get('/court-documents')
      .expect(200)
      .expect(res => {
        const text = res.text.replace(/\s+/g, ' ')
        expect(text).toContain(
          'Documents received in time order, for a specific OMU, from HMCTS Common Platform, grouped by week and day.',
        )
        expect(text).toContain('Choose a prison')
        expect(text).not.toContain('What you need to do')
      })
  })

  it('goes straight to the prison when the user only has one', () => {
    prisonService.getAllPrisons.mockResolvedValue([{ prisonId: 'LEI', prisonName: 'Leeds' }] as never)

    return request(app).get('/court-documents').expect(302).expect('Location', '/court-documents/LEI')
  })

  it('offers unmatched documents to the support role, on the list and in the week navigation', () => {
    return request(app)
      .get('/court-documents')
      .expect(200)
      .expect(res => expect(res.text).toContain('data-qa="unmatched-link"'))
  })

  it('leaves out unmatched documents for someone without the support role', () => {
    const calculator = {
      ...supportUser,
      roles: [Roles.getRole(Role.RELEASE_DATES_CALCULATOR), Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)],
    }

    return request(appAs({ ...calculator, roles: [Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)] }))
      .get('/court-documents')
      .expect(200)
      .expect(res => expect(res.text).toContain('data-qa="unmatched-link"'))
  })

  it('lists a handful of prisons as tasks', () => {
    return request(app)
      .get('/court-documents')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="prison-list"')
        expect(res.text).not.toContain('data-qa="prison-picker"')
      })
  })

  it('offers a picker when there are more prisons than a list can hold', () => {
    const many = prisons(12)
    prisonService.getAllPrisons.mockResolvedValue(many as never)
    app = appAs({
      ...supportUser,
      caseLoads: many.map(prison => ({ ...user.caseLoads[0], caseLoadId: prison.prisonId })),
    })

    return request(app)
      .get('/court-documents')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="prison-picker"')
        expect(res.text).not.toContain('data-qa="prison-list"')
      })
  })

  it('goes to the prison the picker chose', () => {
    const many = prisons(12)
    prisonService.getAllPrisons.mockResolvedValue(many as never)
    app = appAs({
      ...supportUser,
      caseLoads: many.map(prison => ({ ...user.caseLoads[0], caseLoadId: prison.prisonId })),
    })

    return request(app).get('/court-documents?prison=P03').expect(302).expect('Location', '/court-documents/P03')
  })

  it('ignores a picker choice outside the user caseloads', () => {
    return request(app).get('/court-documents?prison=MDI').expect(200)
  })

  it('refuses a prison outside the user caseloads, as the person pages do', () => {
    return request(app)
      .get('/court-documents/MDI')
      .expect(res => {
        expect(res.status).not.toBe(200)
        expect(courtDataIngestionService.getPrisonCourtDocumentWeek).not.toHaveBeenCalled()
      })
  })

  it('refuses a day at a prison outside the user caseloads', () => {
    return request(app)
      .get('/court-documents/MDI/day?date=2026-09-08')
      .expect(res => {
        expect(res.status).not.toBe(200)
        expect(courtDataIngestionService.getPrisonCourtDocumentDay).not.toHaveBeenCalled()
      })
  })
})

describe('GET /court-documents/:prisonCode', () => {
  const mondayBack = (weeks: number) =>
    dayjs()
      .subtract((dayjs().day() + 6) % 7, 'day')
      .subtract(weeks, 'week')
  const weekStarting = (monday: dayjs.Dayjs) =>
    week({ from: monday.format('YYYY-MM-DD'), to: monday.add(6, 'day').format('YYYY-MM-DD') })

  it('calls the current week This week, with the prison as the caption', () => {
    courtDataIngestionService.getPrisonCourtDocumentWeek.mockResolvedValue(weekStarting(mondayBack(0)))

    return request(app)
      .get('/court-documents/LEI')
      .expect(200)
      .expect(res => {
        expect(res.text).toMatch(/govuk-caption-xl">Leeds</)
        expect(res.text).toMatch(/<h1 class="govuk-heading-xl">This week<\/h1>/)
        expect(res.text).toContain('<title>')
        expect(res.text).toMatch(/<title>[^<]*This week - Leeds<\/title>/)
      })
  })

  it('calls the week before Last week', () => {
    courtDataIngestionService.getPrisonCourtDocumentWeek.mockResolvedValue(weekStarting(mondayBack(1)))

    return request(app)
      .get('/court-documents/LEI')
      .expect(200)
      .expect(res => expect(res.text).toMatch(/<h1 class="govuk-heading-xl">Last week<\/h1>/))
  })

  it('names an older week by the Monday it starts on', () => {
    const monday = mondayBack(3)
    courtDataIngestionService.getPrisonCourtDocumentWeek.mockResolvedValue(weekStarting(monday))

    return request(app)
      .get(`/court-documents/LEI?date=${monday.format('YYYY-MM-DD')}`)
      .expect(200)
      .expect(res =>
        expect(res.text).toContain(`<h1 class="govuk-heading-xl">Week commencing ${monday.format('D MMMM YYYY')}</h1>`),
      )
  })

  it('says the same in the prison context, for someone sent straight here, then asks for a day', () => {
    return request(app)
      .get('/court-documents/LEI')
      .expect(200)
      .expect(res => {
        const text = res.text.replace(/\s+/g, ' ')
        expect(text).toContain(
          'Documents received in time order, for Leeds, from HMCTS Common Platform, grouped by week and day.',
        )
        expect(text).not.toContain('Choose a day')
        expect(text).not.toContain('What you need to do')
      })
  })

  it('lists the days as tasks, with what arrived on each, and the recent weeks alongside', () => {
    return request(app)
      .get('/court-documents/LEI')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="week-days"')
        expect(res.text).toContain('Monday 7 September')
        expect(res.text).not.toContain('Mon 7 Sep')
        expect(res.text).toContain('3 documents, 2 people')
        expect(res.text).toContain('Nothing arrived')
        expect(res.text).toContain('data-qa="week-nav"')
      })
  })

  it('asks remand and sentencing nothing for a week, since a week cannot be checked yet', () => {
    return request(app)
      .get('/court-documents/LEI')
      .expect(200)
      .expect(() => {
        expect(courtDataIngestionService.getPrisonCourtDocumentDay).not.toHaveBeenCalled()
        expect(remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate).not.toHaveBeenCalled()
      })
  })

  it('links only the days that have something behind them', () => {
    return request(app)
      .get('/court-documents/LEI')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('/court-documents/LEI/day?date=2026-09-07')
        expect(res.text).not.toContain('/court-documents/LEI/day?date=2026-09-08')
      })
  })

  it('lists the current week first, whichever week is being viewed', () => {
    courtDataIngestionService.getPrisonCourtDocumentWeek.mockResolvedValue(
      week({ from: '2026-08-31', to: '2026-09-06', nextWeek: '2026-09-07' }),
    )
    const thisMonday = dayjs().subtract((dayjs().day() + 6) % 7, 'day')

    return request(app)
      .get('/court-documents/LEI?date=2026-08-31')
      .expect(200)
      .expect(res => {
        const recent = res.text.split('data-qa="week-nav"')[1]
        expect(recent).toContain(`?date=${thisMonday.format('YYYY-MM-DD')}`)
        expect(recent).toContain('moj-side-navigation__item--active')
      })
  })

  it('the previous and next links step a week either side of the week shown', () => {
    courtDataIngestionService.getPrisonCourtDocumentWeek.mockResolvedValue(
      week({ from: '2026-08-31', to: '2026-09-06' }),
    )

    return request(app)
      .get('/court-documents/LEI?date=2026-08-31')
      .expect(200)
      .expect(res => {
        expect(courtDataIngestionService.getPrisonCourtDocumentWeek).toHaveBeenCalledWith('LEI', '2026-08-31', 'user1')
        expect(res.text).toContain('href="/court-documents/LEI?date=2026-08-24"')
        expect(res.text).toContain('data-qa="previous-week"')
        expect(res.text).toContain('href="/court-documents/LEI?date=2026-09-07"')
        expect(res.text).toContain('data-qa="next-week"')
        expect(res.text).toContain('govuk-pagination')
        expect(res.text).not.toContain('govuk-pagination--block')
      })
  })

  it('offers no next link on the current week', () => {
    const thisMonday = dayjs().subtract((dayjs().day() + 6) % 7, 'day')
    courtDataIngestionService.getPrisonCourtDocumentWeek.mockResolvedValue(
      week({ from: thisMonday.format('YYYY-MM-DD'), to: thisMonday.add(6, 'day').format('YYYY-MM-DD') }),
    )

    return request(app)
      .get('/court-documents/LEI')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('data-qa="next-week"')
      })
  })

  it('shows the day list, leaving the entries themselves to the day', () => {
    return request(app)
      .get('/court-documents/LEI')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="week-days"')
        expect(res.text).not.toContain('data-qa="arrival-list"')
      })
  })

  it('shows nothing to view rather than a table of zeros', () => {
    courtDataIngestionService.getPrisonCourtDocumentWeek.mockResolvedValue(
      week({ totalDocuments: 0, days: [{ date: '2026-09-07', documents: 0, people: 0 }] }),
    )

    return request(app)
      .get('/court-documents/LEI')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Nothing to view')
        expect(res.text).not.toContain('data-qa="week-days"')
        expect(res.text).toContain('data-qa="previous-week"')
      })
  })

  it('shows nothing to view on a day with no documents', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({ hearings: [], documentsWithoutAHearing: [], people: [] }),
    )

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Nothing to view')
        expect(res.text).not.toContain('data-qa="arrival-list"')
      })
  })

  it('marks an arrival still owed something, with autocomplete as a primary button', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('document--action')
        expect(res.text).toMatch(/class="govuk-button govuk-!-margin-bottom-0"[^>]*>\s*Autocomplete/)
      })
  })

  it('leaves an arrival already recorded unmarked, so what is left stands out', () => {
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        cases: [{ caseReference: CASE_REFERENCE, caseUniqueIdentifier: 'asdasdx1x21x1' }],
        hasBeenCompleted: true,
      },
    ])

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('document--action')
        expect(res.text).toMatch(/govuk-tag--green[^>]*>\s*Existing appearance/)
      })
  })

  it('shows the court, hearing date and hearing type for a hearing, as the documents tab does', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Leeds Crown Court')
        expect(res.text).toContain('08 September 2026')
        expect(res.text).toContain('First appearance')
      })
  })

  it('shows the person before their case, and no separate court case column', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text.indexOf('>Person</p>')).toBeGreaterThan(-1)
        expect(res.text.indexOf('>Person</p>')).toBeLessThan(res.text.indexOf('>Case reference</p>'))
        expect(res.text).not.toContain('>Court case</p>')
      })
  })

  it('sends autocomplete to the landing page, where the documents can be seen first', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Autocomplete')
        expect(res.text).toContain(`/person/${PRISONER}/review-new-documents/${HEARING}/landing"`)
        expect(res.text).not.toContain('/start')
      })
  })

  it('offers recording the appearance where the case exists but the hearing is not offered', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({
        hearings: [
          {
            ...day().hearings[0],
            documents: [{ ...day().hearings[0].documents[0], documentType: 'SENTENCING_WARRANT' }],
          },
        ],
      }),
    )
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        features: [{ type: 'NEW_SENTENCING_APPEARANCE_ON_EXISTING_CASE', enabled: false }],
        cases: [{ caseReference: CASE_REFERENCE, caseUniqueIdentifier: 'case-uuid-1' }],
      },
    ])

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Record appearance')
        expect(res.text).toContain(`/person/${PRISONER}/view-court-case/case-uuid-1/details`)
        expect(res.text).toContain(`view-court-case/case-uuid-1/details">${CASE_REFERENCE}`)
      })
  })

  it('offers recording case and appearance where neither exists', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({ hearings: [{ ...day().hearings[0], caseReferences: [CASE_REFERENCE, 'OTHER123'] }] }),
    )
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        features: [{ type: 'REMAND_WARRANT', enabled: false }],
        cases: [],
      },
    ])

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Record case and appearance')
        expect(res.text).not.toContain('view-court-case/')
      })
  })

  it('asks remand and sentencing nothing about what it would offer', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Autocomplete')
        expect(remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate).toHaveBeenCalledTimes(1)
      })
  })

  it('does not offer a hearing with a sentencing warrant, on a new case or an existing one', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({
        hearings: [
          {
            ...day().hearings[0],
            documents: [{ ...day().hearings[0].documents[0], documentType: 'SENTENCING_WARRANT' }],
          },
        ],
      }),
    )
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        features: [{ type: 'NEW_SENTENCING_APPEARANCE_ON_EXISTING_CASE', enabled: false }],
        cases: [{ caseReference: CASE_REFERENCE, caseUniqueIdentifier: '1231' }],
      },
    ])

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('>Autocomplete')
        expect(res.text).toMatch(/govuk-button--secondary[^>]*>\s*Record appearance/)
      })
  })

  it('asks about each person once, not once per hearing', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({
        hearings: [day().hearings[0], { ...day().hearings[0], courtHearingId: 'another-hearing' }],
        people: [{ prisonerNumber: PRISONER, firstName: 'Chappel', lastName: 'House' }],
      }),
    )

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(() => {
        expect(remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate).toHaveBeenCalledTimes(1)
      })
  })

  it('shows the person by name, with their number alongside', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('House, Chappel')
        expect(res.text).toContain(PRISONER)
      })
  })

  it('falls back to the prison number when the roll carried no name', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({ people: [{ prisonerNumber: PRISONER }] }),
    )

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain(PRISONER)
        expect(res.text).not.toContain('House, Chappel')
      })
  })

  it('links documents to the person documents tab, filtered to the case', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain(`href="/prisoner/${PRISONER}/overview"`)
        expect(res.text).toContain(`/prisoner/${PRISONER}/documents?byCaseReference=${CASE_REFERENCE}`)
      })
  })

  it('flags a document addressed to another prison, which is the point of the view', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({
        hearings: [
          {
            ...day().hearings[0],
            documents: [{ ...day().hearings[0].documents[0], addressedPrison: 'MDI' }],
          },
        ],
      }),
    )

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toMatch(/Addressed to<\/p>\s*<p[^>]*>Moorland/)
      })
  })

  it('groups documents with no hearing by person and case, so a warrant and its register stay together', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({
        hearings: [],
        documentsWithoutAHearing: [
          {
            prisonDocumentId: 'a',
            prisonerNumber: PRISONER,
            documentType: 'REMAND_WARRANT',
            caseReferences: [CASE_REFERENCE],
            receivedAt: '2026-09-08T10:00:00',
          },
          {
            prisonDocumentId: 'b',
            prisonerNumber: PRISONER,
            documentType: 'PRISON_COURT_REGISTER',
            caseReferences: [CASE_REFERENCE],
            receivedAt: '2026-09-08T10:01:00',
          },
        ],
      }),
    )

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text.match(/data-qa="arrival"/g)).toHaveLength(1)
        expect(res.text).toContain('Remand warrant and prison court register')
      })
  })

  it('leaves out the hearing fields for documents with no hearing, since they can never be filled in', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({
        hearings: [],
        documentsWithoutAHearing: [
          {
            prisonDocumentId: '33333333-3333-3333-3333-333333333333',
            prisonerNumber: PRISONER,
            documentType: 'PRISON_COURT_REGISTER',
            caseReferences: [],
            receivedAt: '2026-09-08T10:00:00',
          },
        ],
      }),
    )

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Prison court register')
        expect(res.text).not.toContain('Court name')
        expect(res.text).not.toContain('Hearing type')
        expect(res.text).toContain('Date added')
      })
  })

  it('leaves out addressed to when the documents came to the prison being viewed', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('Addressed to')
      })
  })

  it('counts a hearing as done when its case already has an appearance on the hearing date', () => {
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        cases: [{ caseReference: CASE_REFERENCE, caseUniqueIdentifier: '1231' }],
        hasBeenCompleted: true,
      },
    ])

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('1 of 1 already recorded in DPS')
        expect(res.text).toMatch(/govuk-button--secondary[^>]*>\s*View case/)
        expect(res.text).toContain('data-qa="appearance-link"')
        expect(res.text).toContain('details#:~:text=Hearing%20date-,08%2F09%2F2026')
        expect(res.text).not.toContain('Record appearance')
      })
  })

  it('links a done hearing to its case when R&S reports the case under its latest reference', () => {
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        cases: [{ caseReference: 'T20267001', caseUniqueIdentifier: 'later-reference-case' }],
        hasBeenCompleted: true,
      },
    ])

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('1 of 1 already recorded in DPS')
        expect(res.text).toContain(`/person/${PRISONER}/view-court-case/later-reference-case/details`)
      })
  })

  it('matches a case reference ignoring letter case, as R&S does', () => {
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        cases: [{ caseReference: CASE_REFERENCE.toLowerCase(), caseUniqueIdentifier: 'lower-case-case' }],
        hasBeenCompleted: false,
        hasWarrantAndPcr: false,
      },
    ])

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Record appearance')
        expect(res.text).toContain(`/person/${PRISONER}/view-court-case/lower-case-case/details`)
      })
  })

  it('still shows the day when a hearing is done but R&S returns no case for it', () => {
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      { ...eligibility, cases: [], hasBeenCompleted: true },
    ])

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('1 of 1 already recorded in DPS')
        expect(res.text).toMatch(/govuk-button--secondary[^>]*>\s*View case/)
        expect(res.text).not.toContain('data-qa="appearance-link"')
      })
  })

  it('does not count a hearing as done when its case has only an older appearance', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({
        hearings: [
          {
            ...day().hearings[0],
            documents: [{ ...day().hearings[0].documents[0], documentType: 'SENTENCING_WARRANT' }],
          },
        ],
      }),
    )
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        cases: [{ caseReference: CASE_REFERENCE, caseUniqueIdentifier: '1231' }],
        features: [{ type: 'SENTENCING_WARRANT', enabled: false }],
        hasBeenCompleted: false,
      },
    ])
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toMatch(/govuk-button--secondary[^>]*>\s*Record appearance/)
        expect(res.text).toContain('0 of 1 already recorded in DPS')
      })
  })

  it('summarises what can be autocompleted and what needs recording by hand', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('0 of 1 already recorded in DPS')
        expect(res.text).toContain('1 can be autocompleted and 0 need recording by hand')
        expect(res.text).not.toContain('people currently held')
      })
  })

  it('states the facts remand and sentencing decides on: several case references', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({ hearings: [{ ...day().hearings[0], caseReferences: [CASE_REFERENCE, 'OTHER123'] }] }),
    )

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Several cases')
      })
  })

  it('states the facts remand and sentencing decides on: no warrant', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({
        hearings: [
          {
            ...day().hearings[0],
            documents: [{ ...day().hearings[0].documents[0], documentType: 'PRISON_COURT_REGISTER' }],
          },
        ],
      }),
    )

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('No warrant')
      })
  })

  it('states what arrived even when everything looks eligible', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Remand warrant')
        expect(res.text).toContain('data-qa="facts"')
      })
  })

  it('marks an existing case and appearance as facts', () => {
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        cases: [{ caseReference: CASE_REFERENCE, caseUniqueIdentifier: '1231' }],
        hasBeenCompleted: true,
      },
    ])

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Existing case')
        expect(res.text).toContain('Existing appearance')
      })
  })

  it('colours the existing case, not a separate label, where repeat hearings are switched off', async () => {
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        cases: [{ caseReference: CASE_REFERENCE, caseUniqueIdentifier: '1231' }],
        features: [{ type: 'NEW_REMAND_APPEARANCE_ON_EXISTING_CASE', enabled: false }],
        hasBeenCompleted: false,
      },
    ])
    const res = await request(app).get('/court-documents/LEI/day?date=2026-09-08').expect(200)

    expect(res.text).toMatch(/govuk-tag--red[^>]*>\s*Existing case/)
    expect(res.text).toMatch(/govuk-tag--grey[^>]*>\s*Remand warrant/)
    expect(res.text).not.toContain('No autocomplete for')
    expect(res.text).not.toContain('Repeat hearings not offered')
  })

  it('stops colouring the existing case once repeat remand hearings are switched on', async () => {
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        cases: [{ caseReference: CASE_REFERENCE, caseUniqueIdentifier: '1231' }],
        features: [{ type: 'NEW_REMAND_APPEARANCE_ON_EXISTING_CASE', enabled: true }],
        hasBeenCompleted: false,
      },
    ])

    const res = await request(app).get('/court-documents/LEI/day?date=2026-09-08').expect(200)

    expect(res.text).toMatch(/govuk-tag--grey[^>]*>\s*Existing case/)
    expect(res.text).not.toContain('govuk-tag--red')
  })

  it('marks a missing warrant as what stopped a hearing being offered', async () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({
        hearings: [
          {
            ...day().hearings[0],
            documents: [{ ...day().hearings[0].documents[0], documentType: 'OTHER' }],
          },
        ],
      }),
    )

    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        hasWarrantAndPcr: false,
      },
    ])

    const res = await request(app).get('/court-documents/LEI/day?date=2026-09-08').expect(200)

    expect(res.text).toMatch(/govuk-tag--red[^>]*>\s*No warrant/)
    expect(res.text).toContain('No warrant<span class="govuk-visually-hidden">, prevents Autocomplete</span>')
  })

  it('tells the landing page a case already exists, as the things-to-do notification does', () => {
    remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate.mockResolvedValue([
      {
        ...eligibility,
        cases: [{ caseReference: CASE_REFERENCE, caseUniqueIdentifier: 'case-uuid-1' }],
      },
    ])

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain(`/person/${PRISONER}/review-new-documents/${HEARING}/landing/existing-case"`)
        expect(res.text).not.toContain('/start')
      })
  })
})

describe('support view and preview', () => {
  const DAY = '/court-documents/LEI/day?date=2026-09-08'

  it('shows the labels to the support role', () => {
    return request(app)
      .get(DAY)
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="facts"')
        expect(res.text).not.toContain('data-qa="preview-banner"')
      })
  })

  it('previewing hides the labels, keeps the next step, and says it is a preview', () => {
    return request(app)
      .get(`${DAY}&preview=non-support`)
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('data-qa="facts"')
        expect(res.text).toContain('Autocomplete')
        expect(res.text).toContain('data-qa="preview-banner"')
        expect(res.text).toContain('href="/court-documents/LEI/day?date=2026-09-08&amp;preview=off"')
      })
  })

  it('carries the preview across the pages until it is stopped', async () => {
    const agent = request.agent(app)

    const list = await agent.get('/court-documents?preview=non-support').expect(200)
    expect(list.text).not.toContain('data-qa="unmatched-link"')
    expect(list.text).toContain('data-qa="preview-banner"')

    const weekPage = await agent.get('/court-documents/LEI').expect(200)
    expect(weekPage.text).not.toContain('Unmatched documents')
    expect(weekPage.text).toContain('data-qa="preview-banner"')

    const dayPage = await agent.get(DAY).expect(200)
    expect(dayPage.text).not.toContain('data-qa="facts"')

    const stopped = await agent.get(`${DAY}&preview=off`).expect(200)
    expect(stopped.text).toContain('data-qa="facts"')
    expect(stopped.text).not.toContain('data-qa="preview-banner"')
  })

  it('cannot give anyone access: the pages still need the support role', () => {
    return request(appAs(nonSupportUser))
      .get('/court-documents?preview=non-support')
      .expect(302)
      .expect('Location', '/authError')
  })
})
