import { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes } from '../testutils/appSetup'

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({})
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Test accessibility page', () => {
  it('GET /accessibility should ', () => {
    return request(app)
      .get('/accessibility')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('Accessibility statement for the Court cases and release dates service')
      })
  })

  it('GET /accessibility should contain the current support email address and not the old one', () => {
    return request(app)
      .get('/accessibility')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('mailto:CourtCasesandReleaseDates@justice.gov.uk?subject=Accessibility%20issue')
        expect(res.text).not.toContain('calculatereleasedates@digital.justice.gov.uk')
        expect(res.text).not.toContain('calculatereleasedates@justice.gov.uk')
      })
  })
})
