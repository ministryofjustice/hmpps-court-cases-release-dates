import { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import { BackfillListResponse } from '../../model/backfill'

jest.mock('../../services/courtDataIngestionService')
const courtDataIngestionService = new CourtDataIngestionService(null) as jest.Mocked<CourtDataIngestionService>

const supportUser = { ...user, roles: ['COURTCASE_RELEASEDATE_SUPPORT'] }
const nonSupportUser = { ...user, roles: ['RELEASE_DATES_CALCULATOR'] }

const appAs = (as: Express.User) =>
  appWithAllRoutes({ services: { courtDataIngestionService }, userSupplier: () => as })

let app: Express

const listResponse: BackfillListResponse = {
  registered: ['extraction', 'defendant-resolution', 'hash'],
  recent: [
    {
      backfillId: 'extraction',
      runId: '11111111-1111-1111-1111-111111111111',
      status: 'RUNNING',
      cursor: '4200',
      processed: 4200,
      failed: 3,
      startedAt: '2026-07-27T09:00:00',
      heartbeatAt: '2026-07-27T09:14:30',
      triggeredBy: 'user1',
    },
    {
      backfillId: 'hash',
      runId: '22222222-2222-2222-2222-222222222222',
      status: 'FAILED',
      processed: 12,
      failed: 1,
      startedAt: '2026-07-26T14:00:00',
      completedAt: '2026-07-26T14:02:11',
      triggeredBy: 'someone-else',
      failureReason: 'Connection reset reading document 91',
    },
  ],
}

beforeEach(() => {
  app = appAs(supportUser)
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Backfill overview authorisation', () => {
  it('GET /backfills is refused without the support role', () => {
    return request(appAs(nonSupportUser))
      .get('/backfills')
      .expect(302)
      .expect('Location', '/authError')
      .expect(() => {
        expect(courtDataIngestionService.listBackfills).not.toHaveBeenCalled()
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
  it('lists every registered backfill with its most recent run', () => {
    courtDataIngestionService.listBackfills.mockResolvedValue(listResponse)

    return request(app)
      .get('/backfills')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('extraction')
        expect(res.text).toContain('defendant-resolution')
        expect(res.text).toContain('hash')
        expect(res.text).toContain('Running')
        expect(res.text).toContain('Failed')
        expect(res.text).toContain('Never run')
      })
  })

  it('shows progress counts and who triggered the run', () => {
    courtDataIngestionService.listBackfills.mockResolvedValue(listResponse)

    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('4200')
        expect(res.text).toContain('user1')
        expect(res.text).toContain('Connection reset reading document 91')
      })
  })

  it('passes the user token through to the service', () => {
    courtDataIngestionService.listBackfills.mockResolvedValue(listResponse)

    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(() => {
        expect(courtDataIngestionService.listBackfills).toHaveBeenCalledWith(supportUser.token)
      })
  })

  it('disables the start button for a backfill that is already running', () => {
    courtDataIngestionService.listBackfills.mockResolvedValue(listResponse)

    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('data-qa="start-defendant-resolution"')
        expect(res.text).not.toContain('data-qa="start-extraction"')
      })
  })

  it('shows a success banner after a run has been started', () => {
    courtDataIngestionService.listBackfills.mockResolvedValue(listResponse)

    return request(app)
      .get('/backfills?outcome=started&id=extraction')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('extraction started')
      })
  })

  it('shows a warning banner when a run was rejected as already in flight', () => {
    courtDataIngestionService.listBackfills.mockResolvedValue(listResponse)

    return request(app)
      .get('/backfills?outcome=already-running&id=extraction')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('a run is already in flight')
      })
  })

  it('shows no banner when there is no outcome in the query', () => {
    courtDataIngestionService.listBackfills.mockResolvedValue(listResponse)

    return request(app)
      .get('/backfills')
      .expect(200)
      .expect(res => {
        expect(res.text).not.toContain('govuk-notification-banner')
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
