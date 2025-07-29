import nock from 'nock'
import config from '../config'
import RemandAndSentencingService from './remandAndSentencingService'
import { ApiRecall, Recall, RecallTypes } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

const prisonerId = 'A1234AB'

describe('Remand and sentencing service', () => {
  let remandAndSentencingService: RemandAndSentencingService
  let fakeApi: nock.Scope
  beforeEach(() => {
    config.apis.remandAndSentencingApi.url = 'http://localhost:8100'
    fakeApi = nock(config.apis.remandAndSentencingApi.url)
    remandAndSentencingService = new RemandAndSentencingService()
  })
  afterEach(() => {
    nock.cleanAll()
  })
  describe('Latest calc card', () => {
    it('Should get all recalls and map to latest recall', async () => {
      const earlyApiRecall: ApiRecall = {
        createdAt: '2024-12-18T00:00:00.000Z',
        createdByUsername: 'JBLOGGS',
        prisonerId: 'A1234AB',
        revocationDate: '2023-06-18',
        recallType: 'LR',
        recallUuid: 'a-uuid',
        returnToCustodyDate: '2023-06-18',
        createdByPrison: 'PRI',
        source: 'DPS',
      }

      const latestApiRecall: ApiRecall = {
        createdAt: '2024-12-18T00:00:00.000Z',
        createdByUsername: 'JBLOGGS',
        prisonerId: 'A1234AB',
        revocationDate: '2024-12-18',
        recallType: 'CUR_HDC',
        recallUuid: 'b-uuid',
        returnToCustodyDate: '2024-12-25',
        createdByPrison: 'HMI',
        source: 'DPS',
      }

      const latestRecallCard: Recall = {
        recallId: 'b-uuid',
        recallDate: new Date('2024-12-18'),
        recallType: RecallTypes.HDC_CURFEW_VIOLATION_RECALL,
        returnToCustodyDate: new Date('2024-12-25'),
        ual: 6,
        ualString: '6 days',
        location: 'HMI',
        source: 'DPS',
      }

      fakeApi.get(`/recall/person/${prisonerId}`).reply(200, [earlyApiRecall, latestApiRecall])
      const result = await remandAndSentencingService.getMostRecentRecall(prisonerId, null)
      expect(result).toStrictEqual(latestRecallCard)
    })

    it('Should return undefined card if no prisoner or calc found', async () => {
      fakeApi.get(`/recall/person/${prisonerId}`).reply(200, [])
      const result = await remandAndSentencingService.getMostRecentRecall(prisonerId, null)
      expect(result).toStrictEqual(undefined)
    })
  })
})
