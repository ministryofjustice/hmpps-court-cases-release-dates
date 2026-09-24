import { Express } from 'express'
import request from 'supertest'
import dayjs from 'dayjs'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import RemandAndSentencingService from '../../services/remandAndSentencingService'
import PrisonService from '../../services/prisonService'
import {
  PrisonCourtDocumentDay,
  PrisonCourtDocumentWeek,
} from '../../@types/courtDataIngestionApi/prisonCourtDocumentTypes'
import { Role, Roles } from '../../@types/roles'

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
  remandAndSentencingService.getCourtContext.mockResolvedValue({
    offeredHearingIds: new Set([HEARING]),
    casesByReference: new Map(),
    autocompleteChecked: true,
  })
})

afterEach(() => jest.resetAllMocks())

describe('access', () => {
  it('is refused without the support role', () => {
    return request(appAs(nonSupportUser)).get('/court-documents').expect(302).expect('Location', '/authError')
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

    // the link is shown by role, so take the support role away while keeping access
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
  it('lists the days as tasks, with what arrived on each, and the recent weeks alongside', () => {
    return request(app)
      .get('/court-documents/LEI')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="week-days"')
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
        expect(remandAndSentencingService.getCourtContext).not.toHaveBeenCalled()
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
        // the week being viewed is plain text rather than a link
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
        // the pagination component, laid out as a row rather than stacked
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

  it('highlights hearings that can be autocompleted, with the step as a primary button', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('document--autocomplete')
        expect(res.text).toMatch(/class="govuk-button govuk-!-margin-bottom-0"[^>]*>\s*Autocomplete/)
      })
  })

  it('warns when remand and sentencing could not be checked, rather than implying nothing is eligible', () => {
    remandAndSentencingService.getCourtContext.mockRejectedValue(new Error('forbidden'))

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Remand and sentencing could not be checked for 1 person')
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

  it('offers autocomplete where remand and sentencing will prefill the hearing', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Autocomplete')
        expect(res.text).toContain(`/person/${PRISONER}/review-new-documents/${HEARING}/start`)
      })
  })

  it('offers recording the appearance where the case exists but the hearing is not offered', () => {
    remandAndSentencingService.getCourtContext.mockResolvedValue({
      offeredHearingIds: new Set(),
      casesByReference: new Map([[CASE_REFERENCE, 'case-uuid-1']]),
      autocompleteChecked: true,
    })

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
    remandAndSentencingService.getCourtContext.mockResolvedValue({
      offeredHearingIds: new Set(),
      casesByReference: new Map(),
      autocompleteChecked: true,
    })

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Record case and appearance')
        expect(res.text).toMatch(/Court case<\/p>\s*<p[^>]*>Not recorded/)
      })
  })

  it('falls back to the manual route when remand and sentencing cannot be asked', () => {
    remandAndSentencingService.getCourtContext.mockRejectedValue(new Error('unavailable'))

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Record case and appearance')
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
        expect(remandAndSentencingService.getCourtContext).toHaveBeenCalledTimes(1)
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

  it('says some recorded, and asks for the case to be recorded, when only some references are in remand and sentencing', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({ hearings: [{ ...day().hearings[0], caseReferences: [CASE_REFERENCE, 'OTHER123'] }] }),
    )
    remandAndSentencingService.getCourtContext.mockResolvedValue({
      offeredHearingIds: new Set(),
      casesByReference: new Map([[CASE_REFERENCE, 'case-uuid-1']]),
      autocompleteChecked: true,
    })

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toMatch(/Court case<\/p>\s*<p[^>]*>Some recorded/)
        expect(res.text).toMatch(/govuk-button--secondary[^>]*>\s*Record case and appearance/)
      })
  })

  it('counts a hearing as done when its case already has an appearance on the hearing date', () => {
    remandAndSentencingService.getCourtContext.mockResolvedValue({
      offeredHearingIds: new Set(),
      casesByReference: new Map([[CASE_REFERENCE, 'case-uuid-1']]),
      autocompleteChecked: true,
      latestAppearanceDates: new Map([['case-uuid-1', '2026-09-08']]),
      casesChecked: true,
    })

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('1 of 1 recorded in remand and sentencing')
        expect(res.text).toMatch(/govuk-button--secondary[^>]*>\s*View case/)
        expect(res.text).not.toContain('Record appearance')
      })
  })

  it('does not count a hearing as done when its case has only an older appearance', () => {
    remandAndSentencingService.getCourtContext.mockResolvedValue({
      offeredHearingIds: new Set(),
      casesByReference: new Map([[CASE_REFERENCE, 'case-uuid-1']]),
      autocompleteChecked: true,
      latestAppearanceDates: new Map([['case-uuid-1', '2026-06-01']]),
      casesChecked: true,
    })

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toMatch(/govuk-button--secondary[^>]*>\s*Record appearance/)
        expect(res.text).toContain('0 of 1 recorded in remand and sentencing')
      })
  })

  it('summarises what can be autocompleted and what needs recording by hand', () => {
    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('0 of 1 recorded in remand and sentencing')
        expect(res.text).toContain('1 can be autocompleted and 0 need recording by hand')
        expect(res.text).not.toContain('people currently held')
      })
  })

  it('says why autocomplete is not offered when the hearing has several case references', () => {
    courtDataIngestionService.getPrisonCourtDocumentDay.mockResolvedValue(
      day({ hearings: [{ ...day().hearings[0], caseReferences: [CASE_REFERENCE, 'OTHER123'] }] }),
    )
    remandAndSentencingService.getCourtContext.mockResolvedValue({
      offeredHearingIds: new Set(),
      casesByReference: new Map(),
      autocompleteChecked: true,
    })

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Record manually: the hearing has more than one case reference')
      })
  })

  it('says why autocomplete is not offered when no warrant arrived', () => {
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
    remandAndSentencingService.getCourtContext.mockResolvedValue({
      offeredHearingIds: new Set(),
      casesByReference: new Map(),
      autocompleteChecked: true,
    })

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Record manually: no warrant arrived')
      })
  })

  it('admits it does not know why when nothing about the documents explains it', () => {
    remandAndSentencingService.getCourtContext.mockResolvedValue({
      offeredHearingIds: new Set(),
      casesByReference: new Map(),
      autocompleteChecked: true,
    })

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Record manually: remand and sentencing is not offering this hearing')
      })
  })

  it('says autocomplete could not be checked on the entry as well as in the summary', () => {
    remandAndSentencingService.getCourtContext.mockRejectedValue(new Error('forbidden'))

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain(
          'Autocomplete not checked: remand and sentencing could not be asked about this person',
        )
      })
  })

  it('shows a manual step as a secondary button', () => {
    remandAndSentencingService.getCourtContext.mockResolvedValue({
      offeredHearingIds: new Set(),
      casesByReference: new Map(),
      autocompleteChecked: true,
    })

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toMatch(/govuk-button--secondary[^>]*>\s*Record case and appearance/)
      })
  })

  it('carries the court case into the autocomplete journey when one exists', () => {
    remandAndSentencingService.getCourtContext.mockResolvedValue({
      offeredHearingIds: new Set([HEARING]),
      casesByReference: new Map([[CASE_REFERENCE, 'case-uuid-1']]),
      autocompleteChecked: true,
    })

    return request(app)
      .get('/court-documents/LEI/day?date=2026-09-08')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain(`/person/${PRISONER}/review-new-documents/${HEARING}/start/case-uuid-1`)
      })
  })
})
