import { LatestCalculationCardConfig } from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/@types'
import nock from 'nock'
import { LatestCalculation } from '../@types/calculateReleaseDatesApi/types'
import CalculateReleaseDatesService from './calculateReleaseDatesService'
import config from '../config'

const prisonerId = 'A1234AB'

describe('Calculate release dates service', () => {
  let calculateReleaseDatesService: CalculateReleaseDatesService
  let fakeApi: nock.Scope
  beforeEach(() => {
    config.apis.calculateReleaseDatesApi.url = 'http://localhost:8100'
    fakeApi = nock(config.apis.calculateReleaseDatesApi.url)
    calculateReleaseDatesService = new CalculateReleaseDatesService()
  })
  afterEach(() => {
    nock.cleanAll()
  })
  describe('Latest calc card', () => {
    it('Should get latest calc and map to a card', async () => {
      const latestCalc: LatestCalculation = {
        prisonerId,
        bookingId: 123456,
        calculationRequestId: 654321,
        reason: 'Initial check',
        calculatedAt: '2025-02-01T10:30:00',
        source: 'CRDS',
        establishment: 'Kirkham (HMP)',
        dates: [
          { date: '2024-02-21', type: 'CRD', description: 'Conditional release date', hints: [] },
          { date: '2024-06-15', type: 'SLED', description: 'Sentence and licence expiry date', hints: [] },
        ],
      }
      const latestCalcCard: LatestCalculationCardConfig = {
        reason: 'Initial check',
        calculatedAt: '2025-02-01T10:30:00',
        source: 'CRDS',
        establishment: 'Kirkham (HMP)',
        dates: [
          { date: '2024-02-21', type: 'CRD', description: 'Conditional release date', hints: [] },
          { date: '2024-06-15', type: 'SLED', description: 'Sentence and licence expiry date', hints: [] },
        ],
      }
      fakeApi.get(`/calculation/${prisonerId}/latest`).reply(200, latestCalc)
      const result = await calculateReleaseDatesService.getLatestCalculationForPrisoner(prisonerId, null)
      expect(result).toStrictEqual(latestCalcCard)
    })

    it('Should return undefined card if no prisoner or calc found', async () => {
      fakeApi.get(`/calculation/${prisonerId}/latest`).reply(404)
      const result = await calculateReleaseDatesService.getLatestCalculationForPrisoner(prisonerId, null)
      expect(result).toStrictEqual(undefined)
    })
  })
})
