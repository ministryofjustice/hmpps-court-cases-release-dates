import nock from 'nock'
import config from '../config'
import AdjustmentsService from './adjustmentsService'
import HmppsAuthClient from '../data/hmppsAuthClient'
import { Adjustment } from '../@types/adjustmentsApi/types'

const prisonerId = 'A1234AB'
jest.mock('../data/hmppsAuthClient')

describe('Adjustments service', () => {
  let adjustmentService: AdjustmentsService
  let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
  let fakeApi: nock.Scope
  beforeEach(() => {
    config.apis.adjustmentsApi.url = 'http://localhost:8100'
    fakeApi = nock(config.apis.adjustmentsApi.url)
    hmppsAuthClient = new HmppsAuthClient(null) as jest.Mocked<HmppsAuthClient>
    adjustmentService = new AdjustmentsService(hmppsAuthClient)
    hmppsAuthClient.getSystemClientToken.mockResolvedValue('token')
  })
  afterAll(() => {
    nock.restore()
  })

  afterEach(() => {
    nock.cleanAll()
  })
  describe('Get adjustments for person', () => {
    it('Should get adjustments by sentence envelope', async () => {
      const date = new Date('2020-01-01')
      fakeApi.get(`/adjustments?person=${prisonerId}&sentenceEnvelopeDate=2020-01-01`).reply(200, [{} as Adjustment])
      const result = await adjustmentService.getAdjustments(prisonerId, date, 'username')
      expect(result).toStrictEqual([{}])
    })

    it('Should get adjustments if no active sentences', async () => {
      fakeApi.get(`/adjustments?person=${prisonerId}`).reply(200, [{} as Adjustment])
      const result = await adjustmentService.getAdjustments(prisonerId, null, 'username')
      expect(result).toStrictEqual([{}])
    })
  })
})
