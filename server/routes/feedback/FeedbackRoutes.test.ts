import { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes } from '../testutils/appSetup'

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({})
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Test feedback page', () => {
  it('GET /feedback should ', () => {
    return request(app)
      .get('/feedback')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(res => {
        const $ = cheerio.load(res.text)
        const emailLink = $('a:contains(OMU.SpecialistSupportTeam@justice.gov.uk)').first()
        expect(emailLink.text()).toContain('OMU.SpecialistSupportTeam@justice.gov.uk')
        expect(res.text).toContain(
          "Whether you're reporting an issue or sharing your opinions, your feedback will help us build",
        )
        expect(res.text).toContain('better, smarter services for you and your colleagues.')
        expect(res.text).toContain('Which part of the service would you like to leave feedback on?')
        expect(res.text).toContain('Providing feedback on our services')
      })
  })
  it('POST /feedback displays the error text if nothing is selected', () => {
    return request(app)
      .post('/feedback')
      .type('form')
      .send()
      .expect(res => {
        expect(res.text).toContain('Select which service you are providing feedback for')
      })
  })
  test.each`
    selected         | url
    ${'crds'}        | ${'https://www.smartsurvey.co.uk/s/calculatereleasedates/'}
    ${'adjustments'} | ${'https://www.smartsurvey.co.uk/s/Adjustments-Helpusbuildbetterservices/'}
  `('POST /feedback redirects to the correct page', ({ selected, url }) => {
    return request(app).post('/feedback').type('form').send({ feedback: selected }).expect(302).expect('Location', url)
  })
})
