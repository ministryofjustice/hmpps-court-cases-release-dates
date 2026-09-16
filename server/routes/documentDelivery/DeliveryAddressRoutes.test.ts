import { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import {
  ClassifyAddressPreview,
  DeliveryCategory,
  UnclassifiedAddress,
} from '../../@types/courtDataIngestionApi/deliveryAddressTypes'
import { Role, Roles } from '../../@types/roles'

jest.mock('../../services/courtDataIngestionService')
const courtDataIngestionService = new CourtDataIngestionService(null) as jest.Mocked<CourtDataIngestionService>

const supportUser = { ...user, roles: [Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)] }
const nonSupportUser = { ...user, roles: [Roles.getRole(Role.RELEASE_DATES_CALCULATOR)] }

const appAs = (as: Express.User) =>
  appWithAllRoutes({ services: { courtDataIngestionService }, userSupplier: () => as })

let app: Express

const BIRMINGHAM = 'custody.birmingham@justice.gov.uk'
const YOUTH = 'ycs.warrants@justice.gov.uk'

const prisonCategory: DeliveryCategory = {
  code: 'PRISON',
  name: 'Prison',
  requiresPrisonCode: true,
  unmatchedNeedsReview: true,
  createdAt: '2026-09-01T09:00:00',
}

const youthCategory: DeliveryCategory = {
  code: 'YOUTH_CUSTODY',
  name: 'Youth custody',
  requiresPrisonCode: false,
  unmatchedNeedsReview: false,
  createdAt: '2026-09-01T09:00:00',
}

const birmingham: UnclassifiedAddress = {
  emailAddress: BIRMINGHAM,
  documentCount: 196,
  matchedToPersonCount: 196,
  firstSeen: '2026-05-08',
  lastSeen: '2026-09-09',
  recentDocumentTypes: ['PRISON_COURT_REGISTER', 'REMAND_WARRANT'],
}

const youth: UnclassifiedAddress = {
  emailAddress: YOUTH,
  documentCount: 1343,
  matchedToPersonCount: 313,
  firstSeen: '2026-05-02',
  lastSeen: '2026-09-11',
  recentDocumentTypes: ['REMAND_WARRANT'],
}

const preview: ClassifyAddressPreview = {
  emailAddress: BIRMINGHAM,
  category: prisonCategory,
  prisonCode: 'BMI',
  documentsAffected: 196,
  peopleAffected: 180,
  currentLocations: [
    { prisonCode: 'BMI', people: 120 },
    { prisonCode: 'LEI', people: 60 },
  ],
  locationsSampled: true,
  replacesExisting: false,
}

beforeEach(() => {
  app = appAs(supportUser)
  courtDataIngestionService.getDeliveryAddresses.mockResolvedValue([birmingham, youth])
  courtDataIngestionService.getCategories.mockResolvedValue([prisonCategory, youthCategory])
  courtDataIngestionService.previewClassification.mockResolvedValue(preview)
  courtDataIngestionService.classifyAddress.mockResolvedValue({
    outcome: 'classified',
    result: {
      mappingId: '11111111-1111-1111-1111-111111111111',
      documentsQueued: 196,
      backfillRunId: '22222222-2222-2222-2222-222222222222',
      backfillOutcome: 'started',
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Document delivery authorisation', () => {
  it('GET /document-delivery is refused without the support role', () => {
    return request(appAs(nonSupportUser))
      .get('/document-delivery')
      .expect(302)
      .expect('Location', '/authError')
      .expect(() => {
        expect(courtDataIngestionService.getDeliveryAddresses).not.toHaveBeenCalled()
      })
  })

  it('POST /document-delivery/classify is refused without the support role', () => {
    return request(appAs(nonSupportUser))
      .post('/document-delivery/classify')
      .type('form')
      .send({ emailAddress: BIRMINGHAM, categoryCode: 'PRISON', prisonCode: 'BMI' })
      .expect(302)
      .expect('Location', '/authError')
      .expect(() => {
        expect(courtDataIngestionService.classifyAddress).not.toHaveBeenCalled()
      })
  })

  it('POST /document-delivery/categories is refused without the support role', () => {
    return request(appAs(nonSupportUser))
      .post('/document-delivery/categories')
      .type('form')
      .send({ code: 'YOUTH_CUSTODY', name: 'Youth custody' })
      .expect(302)
      .expect('Location', '/authError')
      .expect(() => {
        expect(courtDataIngestionService.createCategory).not.toHaveBeenCalled()
      })
  })
})

describe('GET /document-delivery', () => {
  it('lists each unclassified address with a link to classify it', () => {
    return request(app)
      .get('/document-delivery')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain(BIRMINGHAM)
        expect(res.text).toContain(YOUTH)
        expect(res.text).toContain(`href="/document-delivery/classify?email=${encodeURIComponent(BIRMINGHAM)}"`)
      })
  })

  it('shows the documents with no person rather than the number matched', () => {
    return request(app)
      .get('/document-delivery')
      .expect(200)
      .expect(res => {
        // Youth custody is 1343 received, 313 matched: the 1030 is the number worth acting on.
        expect(res.text).toContain('1030')
        expect(res.text).not.toContain('313 of 1343')
      })
  })

  it('reports the outcome of a classification when redirected back', () => {
    return request(app)
      .get(
        `/document-delivery?outcome=classified&email=${encodeURIComponent(BIRMINGHAM)}&documents=196&backfill=started`,
      )
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Re-resolution started for 196 documents')
      })
  })
})

describe('POST /document-delivery/classify', () => {
  it('sends a prison category to the check answers page rather than applying it', () => {
    return request(app)
      .post('/document-delivery/classify')
      .type('form')
      .send({ emailAddress: BIRMINGHAM, categoryCode: 'PRISON', prisonCode: 'bmi' })
      .expect(302)
      .expect(
        'Location',
        `/document-delivery/confirm?email=${encodeURIComponent(BIRMINGHAM)}&category=PRISON&prison=BMI`,
      )
      .expect(() => {
        expect(courtDataIngestionService.classifyAddress).not.toHaveBeenCalled()
      })
  })

  it('applies a non prison category in one step, since nothing moves into a caseload', () => {
    return request(app)
      .post('/document-delivery/classify')
      .type('form')
      .send({ emailAddress: YOUTH, categoryCode: 'YOUTH_CUSTODY' })
      .expect(302)
      .expect(() => {
        expect(courtDataIngestionService.classifyAddress).toHaveBeenCalledWith(
          { emailAddress: YOUTH, categoryCode: 'YOUTH_CUSTODY' },
          'token',
        )
      })
  })

  it('asks for a prison code when the category needs one', () => {
    return request(app)
      .post('/document-delivery/classify')
      .type('form')
      .send({ emailAddress: BIRMINGHAM, categoryCode: 'PRISON' })
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Enter the prison code this address belongs to')
        expect(courtDataIngestionService.classifyAddress).not.toHaveBeenCalled()
      })
  })

  it('asks for a category when none was chosen', () => {
    return request(app)
      .post('/document-delivery/classify')
      .type('form')
      .send({ emailAddress: BIRMINGHAM })
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Select where this traffic belongs')
      })
  })
})

describe('GET /document-delivery/confirm', () => {
  it('shows what the mapping would affect and where those people are now', () => {
    return request(app)
      .get(`/document-delivery/confirm?email=${encodeURIComponent(BIRMINGHAM)}&category=PRISON&prison=BMI`)
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('196')
        expect(res.text).toContain('BMI')
        expect(res.text).toContain('LEI')
      })
  })

  it('redirects back when there is nothing to confirm', () => {
    return request(app)
      .get('/document-delivery/confirm')
      .expect(302)
      .expect('Location', '/document-delivery')
      .expect(() => {
        expect(courtDataIngestionService.previewClassification).not.toHaveBeenCalled()
      })
  })
})

describe('POST /document-delivery/confirm', () => {
  it('applies the mapping and reports how many documents will be re-resolved', () => {
    return request(app)
      .post('/document-delivery/confirm')
      .type('form')
      .send({ emailAddress: BIRMINGHAM, categoryCode: 'PRISON', prisonCode: 'BMI' })
      .expect(302)
      .expect('Location', /outcome=classified.*documents=196.*backfill=started/)
      .expect(() => {
        expect(courtDataIngestionService.classifyAddress).toHaveBeenCalledWith(
          { emailAddress: BIRMINGHAM, categoryCode: 'PRISON', prisonCode: 'BMI' },
          'token',
        )
      })
  })
})

describe('POST /document-delivery/categories', () => {
  beforeEach(() => {
    courtDataIngestionService.createCategory.mockResolvedValue({ outcome: 'created' })
  })

  it('creates a category without a prison code, whatever was submitted', () => {
    return request(app)
      .post('/document-delivery/categories')
      .type('form')
      .send({ code: 'youth_custody', name: 'Youth custody', requiresPrisonCode: 'true' })
      .expect(302)
      .expect('Location', '/document-delivery/categories?outcome=created&code=YOUTH_CUSTODY')
      .expect(() => {
        expect(courtDataIngestionService.createCategory).toHaveBeenCalledWith(
          { code: 'YOUTH_CUSTODY', name: 'Youth custody', unmatchedNeedsReview: false, requiresPrisonCode: false },
          'token',
        )
      })
  })

  it('rejects a name with markup rather than sending it to the API', () => {
    return request(app)
      .post('/document-delivery/categories')
      .type('form')
      .send({ code: 'YOUTH_CUSTODY', name: '<img src=x onerror=alert(1)>' })
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Name must be 128 characters or fewer')
        expect(courtDataIngestionService.createCategory).not.toHaveBeenCalled()
      })
  })

  it('reports a duplicate code on the form rather than as an error page', () => {
    courtDataIngestionService.createCategory.mockResolvedValue({ outcome: 'duplicate-category' })

    return request(app)
      .post('/document-delivery/categories')
      .type('form')
      .send({ code: 'PRISON', name: 'Prison' })
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('A category with the code PRISON already exists')
      })
  })
})

describe('GET /document-delivery/classified', () => {
  const classified: UnclassifiedAddress = {
    ...birmingham,
    categoryCode: 'PRISON',
    prisonCode: 'BMI',
  }

  beforeEach(() => {
    courtDataIngestionService.getDeliveryAddresses.mockResolvedValue([classified])
  })

  it('lists classified addresses with the category and prison they map to', () => {
    return request(app)
      .get('/document-delivery/classified')
      .expect(200)
      .expect(res => {
        expect(res.text).toContain(BIRMINGHAM)
        expect(res.text).toContain('PRISON')
        expect(res.text).toContain('BMI')
        expect(courtDataIngestionService.getDeliveryAddresses).toHaveBeenCalledWith(true, undefined, 'token')
      })
  })

  it('narrows the list to the chosen category', () => {
    return request(app)
      .get('/document-delivery/classified?category=YOUTH_CUSTODY')
      .expect(200)
      .expect(() => {
        expect(courtDataIngestionService.getDeliveryAddresses).toHaveBeenCalledWith(true, 'YOUTH_CUSTODY', 'token')
      })
  })

  it('is refused without the support role', () => {
    return request(appAs(nonSupportUser))
      .get('/document-delivery/classified')
      .expect(302)
      .expect('Location', '/authError')
  })
})
