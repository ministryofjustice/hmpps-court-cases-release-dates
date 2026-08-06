import { Express } from 'express'
import request from 'supertest'
import dayjs from 'dayjs'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import { BackfillListResponse, BackfillRunSummary } from '../../model/backfill'
import { Role, Roles } from '../../@types/roles'

jest.mock('../../services/courtDataIngestionService')
const courtDataIngestionService = new CourtDataIngestionService(null) as jest.Mocked<CourtDataIngestionService>

const supportUser = { ...user, roles: [Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)] }
const nonSupportUser = { ...user, roles: [Roles.getRole(Role.RELEASE_DATES_CALCULATOR)] }

const appAs = (as: Express.User) =>
  appWithAllRoutes({ services: { courtDataIngestionService }, userSupplier: () => as })

let app: Express

const localDateTime = (daysAgo: number) =>
  dayjs().subtract(daysAgo, 'day').subtract(2, 'hour').format('YYYY-MM-DDTHH:mm:ss.SSSSSS')

const runningRun: BackfillRunSummary = {
  backfillId: 'extraction',
  runId: '11111111-1111-1111-1111-111111111111',
  status: 'RUNNING',
  cursor: '4200',
  processed: 4200,
  failed: 3,
  startedAt: localDateTime(0),
  heartbeatAt: localDateTime(0),
  triggeredBy: 'JOEL_GEN',
}

const completedWithErrorsRun: BackfillRunSummary = {
  backfillId: 'mirror',
  runId: '22222222-2222-2222-2222-222222222222',
  status: 'COMPLETED',
  processed: 165,
  failed: 72,
  startedAt: localDateTime(4),
  completedAt: localDateTime(4),
  triggeredBy: 'someone-else',
  failureReason: 'Cannot invoke CourtDocumentType.name() because getCourtDocumentType() is null',
}

const cleanRun: BackfillRunSummary = {
  backfillId: 'hash',
  runId: '33333333-3333-3333-3333-333333333333',
  status: 'COMPLETED',
  processed: 2359,
  failed: 0,
  startedAt: localDateTime(11),
  completedAt: localDateTime(11),
  triggeredBy: 'someone-else',
}

const listResponse: BackfillListResponse = {
  registered: ['extraction', 'defendant-resolution-apply', 'hash', 'mirror'],
  recent: [runningRun, completedWithErrorsRun, cleanRun],
}

beforeEach(() => {
  app = appAs(supportUser)
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Backfill authorisation', () => {
  it('GET /backfills is refused without the support role', () => {
    return request(appAs(nonSupportUser))
      .get('/backfills')
      .expect(302)
      .expect('Location', '/authError')
      .expect(() => {
        expect(courtDataIngestionService.listBackfills).not.toHaveBeenCalled()
      })
  })

  it('GET /backfills/:id is refused without the support role', () => {
    return request(appAs(nonSupportUser))
      .get('/backfills/extraction')
      .expect(302)
      .expect('Location', '/authError')
      .expect(() => {
        expect(courtDataIngestionService.getBackfill).not.toHaveBeenCalled()
      })
  })

  it('POST /backfills/:id/start is refused without the support role', () => {
    return request(appAs(nonSupportUser))
      .post('/backfills/extraction/start')
      .type('form')
      .send({})
      .expect(302)
      .expect('Location', '/authError')
      .expect(() => {
        expect(courtDataIngestionService.startBackfill).not.toHaveBeenCalled()
      })
  })
})

describe('GET /backfills', () => {
  beforeEach(() => {
    courtDataIngestionService.listBackfills.mockResolvedValue(listResponse)
  })

  it('lists every registered backfill, linked to its detail page', () => {
    return request(app)
      .get('/backfills')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('href="/backfills/extraction"')
        expect(res.text).toContain('href="/backfills/defendant-resolution-apply"')
        expect(res.text).toContain('href="/backfills/hash"')
        expect(res.text).toContain('href="/backfills/mirror"')
      })
  })

  it('flags a completed run that had failures rather than calling it Completed', () => {
    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Completed with errors')
        expect(res.text).toContain('govuk-tag--yellow')
      })
  })

  it('shows relative times rather than raw timestamps', () => {
    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('4 days ago')
        expect(res.text).toContain('11 days ago')
        expect(res.text).toContain('Never')
        expect(res.text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
      })
  })

  it('formats counts with thousands separators', () => {
    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('4,200')
        expect(res.text).toContain('2,359')
      })
  })

  it('does not put failure detail or triggered by in the table', () => {
    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('Cannot invoke CourtDocumentType')
        expect(res.text).not.toContain('Triggered by')
        expect(res.text).not.toContain('someone-else')
      })
  })

  it('states which environment the backfills will run against, from the configured API url', () => {
    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="target"')
        expect(res.text).toContain('localhost')
        expect(res.text).not.toContain('live production data')
      })
  })

  it('does not show the production warning when the target is not production', () => {
    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('govuk-inset-text')
        expect(res.text).not.toContain('govuk-warning-text')
      })
  })

  it('passes the user token through to the service', () => {
    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(() => {
        expect(courtDataIngestionService.listBackfills).toHaveBeenCalledWith(supportUser.token)
      })
  })

  it('hides the start button for a backfill that is already running', () => {
    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="start-hash"')
        expect(res.text).not.toContain('data-qa="start-extraction"')
      })
  })

  it('offers a refresh link while something is in flight', () => {
    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="refresh"')
      })
  })

  it('hides the refresh link when nothing is running', () => {
    courtDataIngestionService.listBackfills.mockResolvedValue({
      registered: ['hash', 'mirror'],
      recent: [cleanRun, completedWithErrorsRun],
    })

    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('data-qa="refresh"')
      })
  })

  it('shows a success banner after a run has been started', () => {
    return request(app)
      .get('/backfills?outcome=started&id=extraction')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('extraction started')
      })
  })

  it('shows a warning banner when a run was rejected as already in flight', () => {
    return request(app)
      .get('/backfills?outcome=already-running&id=extraction')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('a run is already in flight')
      })
  })

  it('shows no banner when there is no outcome in the query', () => {
    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('govuk-notification-banner')
      })
  })
})

describe('GET /backfills/:backfillId', () => {
  it('shows the full run detail including exact timestamps and who triggered it', () => {
    courtDataIngestionService.getBackfill.mockResolvedValue(completedWithErrorsRun)

    return request(app)
      .get('/backfills/mirror')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('someone-else')
        expect(res.text).toContain('22222222-2222-2222-2222-222222222222')
        expect(res.text).toContain('165')
        expect(res.text).toContain('72')
        expect(courtDataIngestionService.getBackfill).toHaveBeenCalledWith('mirror', supportUser.token)
      })
  })

  it('shows the failure detail that the table no longer carries', () => {
    courtDataIngestionService.getBackfill.mockResolvedValue(completedWithErrorsRun)

    return request(app)
      .get('/backfills/mirror')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="failure-reason"')
        expect(res.text).toContain('Cannot invoke CourtDocumentType')
      })
  })

  it('has no failure section when the run had no failure reason', () => {
    courtDataIngestionService.getBackfill.mockResolvedValue(cleanRun)

    return request(app)
      .get('/backfills/hash')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('data-qa="failure-reason"')
        expect(res.text).not.toContain('Failure detail')
      })
  })

  it('has no failure section when CDIA sends failureReason as null', () => {
    courtDataIngestionService.getBackfill.mockResolvedValue({ ...cleanRun, failureReason: null })

    return request(app)
      .get('/backfills/hash')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('data-qa="failure-reason"')
        expect(res.text).not.toContain('Failure detail')
      })
  })

  it('has no failure section when failureReason is an empty string', () => {
    courtDataIngestionService.getBackfill.mockResolvedValue({ ...cleanRun, failureReason: '' })

    return request(app)
      .get('/backfills/hash')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('data-qa="failure-reason"')
        expect(res.text).not.toContain('Failure detail')
      })
  })

  it('renders null optional fields as a dash rather than the word null', () => {
    courtDataIngestionService.getBackfill.mockResolvedValue({
      ...cleanRun,
      cursor: null,
      runId: null,
      triggeredBy: null,
      heartbeatAt: null,
    })

    return request(app)
      .get('/backfills/hash')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('>null<')
        expect(res.text).toContain('Not recorded')
      })
  })

  it('handles a backfill that has never run', () => {
    courtDataIngestionService.getBackfill.mockResolvedValue({
      backfillId: 'defendant-resolution-apply',
      status: 'NO_RUNS',
      processed: 0,
      failed: 0,
    })

    return request(app)
      .get('/backfills/defendant-resolution-apply')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="never-run"')
        expect(res.text).toContain('data-qa="start-defendant-resolution-apply"')
      })
  })

  it('offers a refresh rather than a start button while a run is in flight', () => {
    courtDataIngestionService.getBackfill.mockResolvedValue(runningRun)

    return request(app)
      .get('/backfills/extraction')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="refresh"')
        expect(res.text).not.toContain('data-qa="start-extraction"')
      })
  })
})

describe('POST /backfills/:id/start', () => {
  it('starts the backfill and redirects with a success outcome', () => {
    courtDataIngestionService.startBackfill.mockResolvedValue({
      outcome: 'started',
      message: 'Backfill extraction started',
      runId: '11111111-1111-1111-1111-111111111111',
    })

    return request(app)
      .post('/backfills/extraction/start')
      .type('form')
      .send({})
      .expect(302)
      .expect('Location', '/backfills?outcome=started&id=extraction')
      .expect(() => {
        expect(courtDataIngestionService.startBackfill).toHaveBeenCalledWith('extraction', supportUser.token)
      })
  })

  it('redirects with an already-running outcome rather than erroring', () => {
    courtDataIngestionService.startBackfill.mockResolvedValue({
      outcome: 'already-running',
      message: 'A run of extraction is already in flight',
    })

    return request(app)
      .post('/backfills/extraction/start')
      .type('form')
      .send({})
      .expect(302)
      .expect('Location', '/backfills?outcome=already-running&id=extraction')
  })

  it('redirects with an unknown-backfill outcome for an id CDIA does not know', () => {
    courtDataIngestionService.startBackfill.mockResolvedValue({
      outcome: 'unknown-backfill',
      message: 'No backfill is registered with the id nonsense',
    })

    return request(app)
      .post('/backfills/nonsense/start')
      .type('form')
      .send({})
      .expect(302)
      .expect('Location', '/backfills?outcome=unknown-backfill&id=nonsense')
  })
})
