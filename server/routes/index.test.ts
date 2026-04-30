import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes } from './testutils/appSetup'
import config from '../config'

describe('Route Handlers - Index', () => {
  afterEach(() => {
    config.maintenanceMode = false
    jest.resetAllMocks()
  })

  it('should redirect to dps', () => {
    const app = appWithAllRoutes({})
    return request(app).get('/').expect(302).expect('Location', config.applications.digitalPrisonServices.url)
  })

  it('should render maintenance page', () => {
    config.maintenanceMode = true
    return request(appWithAllRoutes({}))
      .get('/')
      .expect(503)
      .expect(res => {
        const $ = cheerio.load(res.text)
        const oosHeader = $('[data-qa=oos-header]').first()
        expect(oosHeader.text()).toStrictEqual('Sorry, there is a problem with the service')
        expect(res.text).toContain('courtcasesandreleasedates@justice.gov.uk')
      })
  })
})
