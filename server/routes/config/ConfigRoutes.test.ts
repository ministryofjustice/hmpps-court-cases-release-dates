import { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes, user } from '../testutils/appSetup'
import PrisonerService from '../../services/prisonerService'
import { PrisonApiPrison } from '../../@types/prisonApi/types'

jest.mock('../../services/prisonerService')
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({
    services: { prisonerService },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

const allPrisons = [
  {
    agencyId: 'ALI',
    description: 'Albany (HMP)',
    longDescription: 'HMP ALBANY',
    agencyType: 'INST',
    active: true,
  },
  {
    agencyId: 'ACI',
    description: 'Altcourse (HMP)',
    longDescription: 'HMP ALTCOURSE',
    agencyType: 'INST',
    active: true,
  },
  {
    agencyId: 'ASI',
    description: 'Ashfield (HMP)',
    longDescription: 'HMP & YOI ASHFIELD',
    agencyType: 'INST',
    active: true,
  },
  {
    agencyId: 'AYI',
    description: 'Aylesbury (HMP)',
    longDescription: 'HMP AYLESBURY',
    agencyType: 'INST',
    active: true,
  },
  {
    agencyId: 'BFI',
    description: 'Bedford (HMP)',
    longDescription: 'HMP BEDFORD',
    agencyType: 'INST',
    active: true,
  },
] as PrisonApiPrison[]

describe('Compare routes tests', () => {
  it('GET /config should return to the search if the user does not have the correct role', () => {
    prisonerService.getActivePrisons.mockResolvedValue(allPrisons)
    prisonerService.getPrisonsWithServiceCode.mockResolvedValue([])

    return request(app).get('/config').expect(302).expect('Location', '/')
  })

  it('GET /config should show the page with all the active prisons when the user has the correct role', () => {
    prisonerService.getActivePrisons.mockResolvedValue(allPrisons)
    prisonerService.getPrisonsWithServiceCode.mockResolvedValue([])
    app = appWithAllRoutes({
      services: { prisonerService },
      userSupplier: () => {
        return { ...user, hasReadOnlyNomisConfigAccess: true }
      },
    })

    return request(app)
      .get('/config')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('Select the status of the Adjustments screen')
        expect(res.text).toContain('Checked prisons are read only')
        expect(res.text).toContain('Altcourse (HMP)')
        expect(res.text).toContain('Ashfield (HMP)')
        expect(res.text).toContain('Aylesbury (HMP)')
        expect(res.text).toContain('Albany (HMP)')
        expect(res.text).toContain('Bedford (HMP)')
      })
  })

  it('POST /config for an unchecked prison results in call to the api to enable it', () => {
    prisonerService.getActivePrisons.mockResolvedValue(allPrisons)
    prisonerService.getPrisonsWithServiceCode.mockResolvedValue([])

    return request(app)
      .post('/config')
      .type('form')
      .send({ apiId: 'ADJUSTMENTS', checkedBoxes: 'BFI' })
      .expect(res => {
        expect(prisonerService.postServiceCodeForPrison).toHaveBeenCalledTimes(1)
        expect(prisonerService.postServiceCodeForPrison).toHaveBeenCalledWith('ADJUSTMENTS', 'BFI')
        expect(prisonerService.deleteServiceCodeForPrison).toHaveBeenCalledTimes(0)
      })
  })

  it('POST /config for unchecking a checked prison results in call to the api to disable it', () => {
    prisonerService.getActivePrisons.mockResolvedValue(allPrisons)
    prisonerService.getPrisonsWithServiceCode.mockResolvedValue([{ agencyId: 'BFI', name: 'Bedford (HMP)' }])

    return request(app)
      .post('/config')
      .type('form')
      .send({ apiId: 'ADJUSTMENTS' })
      .expect(res => {
        expect(prisonerService.postServiceCodeForPrison).toHaveBeenCalledTimes(0)
        expect(prisonerService.deleteServiceCodeForPrison).toHaveBeenCalledTimes(1)
        expect(prisonerService.deleteServiceCodeForPrison).toHaveBeenCalledWith('ADJUSTMENTS', 'BFI')
      })
  })

  it('POST /config creates the correct update url for the update banner', () => {
    prisonerService.getActivePrisons.mockResolvedValue(allPrisons)
    prisonerService.getPrisonsWithServiceCode.mockResolvedValue([{ agencyId: 'BFI', name: 'Bedford (HMP)' }])

    return request(app)
      .post('/config')
      .type('form')
      .send({ apiId: 'ADJUSTMENTS', checkedBoxes: ['ALI', 'ACI'] })
      .expect(302)
      .expect('Location', '/config?id=adjustments&readonly=ALI,ACI&notreadonly=BFI')
  })

  it('GET /config should show the banner describing the changes', () => {
    prisonerService.getActivePrisons.mockResolvedValue(allPrisons)
    prisonerService.getPrisonsWithServiceCode.mockResolvedValue([])
    app = appWithAllRoutes({
      services: { prisonerService },
      userSupplier: () => {
        return { ...user, hasReadOnlyNomisConfigAccess: true }
      },
    })

    return request(app)
      .get('/config?id=adjustments&readonly=ALI,ACI&notreadonly=AYI,BFI')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('The Adjustments screen is now read only in these prisons')
        expect(res.text).toContain('The Adjustments screen is now active in these prisons')
      })
  })

  it('GET /config should show the banner describing the changes (singular for one prison)', () => {
    prisonerService.getActivePrisons.mockResolvedValue(allPrisons)
    prisonerService.getPrisonsWithServiceCode.mockResolvedValue([])
    app = appWithAllRoutes({
      services: { prisonerService },
      userSupplier: () => {
        return { ...user, hasReadOnlyNomisConfigAccess: true }
      },
    })

    return request(app)
      .get('/config?id=adjustments&readonly=ALI&notreadonly=BFI')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('The Adjustments screen is now read only in this prison')
        expect(res.text).toContain('The Adjustments screen is now active in this prison')
      })
  })

  test.each`
    url
    ${'/config?id=adjustments&readonly=&notreadonly='}
    ${'/config'}
  `('GET $url should not show the banner if now parameters are passed', ({ url }) => {
    prisonerService.getActivePrisons.mockResolvedValue(allPrisons)
    prisonerService.getPrisonsWithServiceCode.mockResolvedValue([])
    app = appWithAllRoutes({
      services: { prisonerService },
      userSupplier: () => {
        return { ...user, hasReadOnlyNomisConfigAccess: true }
      },
    })

    return request(app)
      .get(url)
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).not.toContain('Success')
        expect(res.text).not.toContain('screen is now read only in this prison')
        expect(res.text).not.toContain('screen is now read only in these prisons')
        expect(res.text).not.toContain('screen is now active in this prison')
        expect(res.text).not.toContain('screen is now active in these prisons')
      })
  })
})
