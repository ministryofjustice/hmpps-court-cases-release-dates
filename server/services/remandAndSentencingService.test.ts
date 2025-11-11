import nock from 'nock'
import config from '../config'
import RemandAndSentencingService from './remandAndSentencingService'
import {
  ApiRecall,
  ImmigrationDetention,
  Recall,
  RecallTypes,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import HmppsAuthClient from '../data/hmppsAuthClient'

const prisonerId = 'A1234AB'

describe('Remand and sentencing service', () => {
  let remandAndSentencingService: RemandAndSentencingService
  let fakeApi: nock.Scope
  let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
  beforeEach(() => {
    config.apis.remandAndSentencingApi.url = 'http://localhost:8100'
    fakeApi = nock(config.apis.remandAndSentencingApi.url)
    hmppsAuthClient = {
      getSystemClientToken: jest.fn().mockResolvedValue('mocked-token'),
    } as unknown as jest.Mocked<HmppsAuthClient>
    remandAndSentencingService = new RemandAndSentencingService(hmppsAuthClient)
    hmppsAuthClient.getSystemClientToken.mockResolvedValue('token')
  })
  afterEach(() => {
    nock.cleanAll()
  })
  describe('Latest calc card', () => {
    it('Should get all recalls and map to latest recall', async () => {
      const earlyApiRecall: ApiRecall = {
        isManual: false,
        createdAt: '2024-12-18T00:00:00.000Z',
        createdByUsername: 'JBLOGGS',
        prisonerId: 'A1234AB',
        revocationDate: '2023-06-18',
        recallType: 'LR',
        recallUuid: 'a-uuid',
        returnToCustodyDate: '2023-06-18',
        createdByPrison: 'PRI',
        source: 'DPS',
        courtCases: [
          {
            courtCaseReference: 'case-123',
            courtCode: 'CROWN123',
            sentencingAppearanceDate: '2024-12-01',
            sentences: [
              {
                sentenceUuid: 'sentence-uuid-1',
                offenceCode: 'OFF123',
                offenceStartDate: '2024-01-01',
                offenceEndDate: '2024-01-15',
                sentenceDate: '2024-01-20',
                periodLengths: [
                  {
                    years: 1,
                    months: 0,
                    weeks: 0,
                    days: 0,
                    periodOrder: '1', // Add the required `periodOrder`
                    periodLengthType: 'SENTENCE_LENGTH', // Add the required `periodLengthType`
                    periodLengthUuid: 'period-length-uuid-1',
                  },
                ],
                sentenceServeType: 'CONCURRENT',
                sentenceTypeDescription: 'Imprisonment',
              },
            ],
          },
        ],
      }

      const latestApiRecall: ApiRecall = {
        isManual: false,
        createdAt: '2024-12-18T00:00:00.000Z',
        createdByUsername: 'JBLOGGS',
        prisonerId: 'A1234AB',
        revocationDate: '2024-12-18',
        recallType: 'CUR_HDC',
        recallUuid: 'b-uuid',
        returnToCustodyDate: '2024-12-25',
        createdByPrison: 'HMI',
        source: 'DPS',
        courtCases: [
          {
            courtCaseReference: 'case-123',
            courtCode: 'CROWN123',
            sentencingAppearanceDate: '2024-12-01',
            sentences: [
              {
                sentenceUuid: 'sentence-uuid-1',
                offenceCode: 'OFF123',
                offenceStartDate: '2024-01-01',
                offenceEndDate: '2024-01-15',
                sentenceDate: '2024-01-20',
                periodLengths: [
                  {
                    years: 1,
                    months: 0,
                    weeks: 0,
                    days: 0,
                    periodOrder: '1', // Add the required `periodOrder`
                    periodLengthType: 'SENTENCE_LENGTH', // Add the required `periodLengthType`
                    periodLengthUuid: 'period-length-uuid-1',
                  },
                ],
                sentenceServeType: 'CONCURRENT',
                sentenceTypeDescription: 'Imprisonment',
              },
            ],
          },
        ],
      }

      const latestRecallCard: Recall = {
        createdAt: '2024-12-18T00:00:00.000Z',
        recallId: 'b-uuid',
        recallDate: new Date('2024-12-18'),
        recallType: RecallTypes.HDC_CURFEW_VIOLATION_RECALL,
        returnToCustodyDate: new Date('2024-12-25'),
        ual: 6,
        ualString: '6 days',
        location: 'HMI',
        source: 'DPS',
        revocationDate: '2024-12-18',
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

    it('GetImmigrationDetentionByPrisoner', async () => {
      const IMMIGRATION_DETENTION_NLI_OBJECT: ImmigrationDetention = {
        source: 'DPS',
        immigrationDetentionUuid: 'IMM-DET-UUID-12345',
        prisonerId: 'ABC123',
        immigrationDetentionRecordType: 'NO_LONGER_OF_INTEREST',
        recordDate: '2022-06-22',
        homeOfficeReferenceNumber: prisonerId,
        noLongerOfInterestReason: 'OTHER_REASON',
        noLongerOfInterestComment: 'Confirmed not of interest',
        createdAt: '2025-11-03T08:06:37.123Z',
      }
      fakeApi.get(`/immigration-detention/person/${prisonerId}/latest`).reply(200, IMMIGRATION_DETENTION_NLI_OBJECT)

      const result = await remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner(
        prisonerId,
        'test-username',
      )

      expect(result).toEqual(IMMIGRATION_DETENTION_NLI_OBJECT)
    })
  })
})
