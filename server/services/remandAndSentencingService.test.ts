import nock from 'nock'
import config from '../config'
import RemandAndSentencingService from './remandAndSentencingService'
import {
  ApiRecall,
  ImmigrationDetention,
  Recall,
  RecallTypes,
  SearchCourtCasesPage,
  SentenceConsecutiveToDetailsResponse,
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
                aggravatingFactors: [],
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
        ual: { id: '1', days: 6 },
        courtCases: [
          {
            courtCaseReference: 'case-123',
            courtCode: 'CROWN123',
            sentencingAppearanceDate: '2024-12-01',
            sentences: [
              {
                aggravatingFactors: [],
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
        location: 'HMI',
        source: 'DPS',
        revocationDate: '2024-12-18',
        inPrisonOnRevocationDate: undefined,
      }

      fakeApi.get(`/recall/person/${prisonerId}/search`).reply(200, {
        recalls: [earlyApiRecall, latestApiRecall],
        prisonerRecallTotal: 2,
      })
      const result = await remandAndSentencingService.getMostRecentRecall(prisonerId, null)
      expect(result).toStrictEqual(latestRecallCard)
    })

    it('Should return undefined card if no prisoner or calc found', async () => {
      fakeApi.get(`/recall/person/${prisonerId}/search`).reply(200, { recalls: [], prisonerRecallTotal: 0 })
      const result = await remandAndSentencingService.getMostRecentRecall(prisonerId, null)
      expect(result).toStrictEqual(undefined)
    })

    it('GetImmigrationDetentionByPrisoner', async () => {
      const IMMIGRATION_DETENTION_NLI_OBJECT: ImmigrationDetention = {
        source: 'DPS',
        immigrationDetentionUuid: 'IMM-DET-UUID-12345',
        courtAppearanceUuid: 'ca-uuid-0001',
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

    describe('getConsecutiveToDetails', () => {
      it('Should return consecutive to details for the given sentence UUIDs', async () => {
        const sentenceUuids = ['sentence-uuid-1', 'sentence-uuid-2']
        const response: SentenceConsecutiveToDetailsResponse = {
          sentences: [
            {
              courtCaseReference: 'case-123',
              courtCode: 'CROWN123',
              appearanceDate: '2024-12-01',
              offenceCode: 'OFF123',
              offenceStartDate: '2024-01-01',
              offenceEndDate: '2024-01-15',
              sentenceUuid: 'sentence-uuid-1',
              countNumber: '1',
            },
          ],
        }

        fakeApi
          .get('/sentence/consecutive-to-details')
          .query({ sentenceUuids: sentenceUuids.join(',') })
          .reply(200, response)

        const result = await remandAndSentencingService.getConsecutiveToDetails(sentenceUuids, 'test-username')

        expect(result).toStrictEqual(response)
      })

      it('Should return empty sentences without calling the API when no sentence UUIDs are provided', async () => {
        const result = await remandAndSentencingService.getConsecutiveToDetails([], 'test-username')

        expect(result).toStrictEqual({ sentences: [] })
      })
    })

    describe('searchCourtCases', () => {
      it('Should return the court cases page for the given prisoner', async () => {
        const sortBy = 'DESC'
        const page = 0
        const size = 10
        const response: SearchCourtCasesPage = {
          content: [],
          prisonerCourtCaseTotal: 0,
          totalElements: 0,
          totalPages: 0,
          size,
          number: page,
          first: true,
          last: true,
          empty: true,
        }

        fakeApi
          .get('/court-case/paged/search')
          .query({ prisonerId, pagedCourtCaseOrderBy: sortBy, page, size })
          .reply(200, response)

        const result = await remandAndSentencingService.searchCourtCases(
          prisonerId,
          'test-username',
          sortBy,
          page,
          size,
        )

        expect(result).toStrictEqual(response)
      })

      it('Should return undefined when the API responds with a 404', async () => {
        const sortBy = 'DESC'
        const page = 0

        fakeApi.get('/court-case/paged/search').query({ prisonerId, pagedCourtCaseOrderBy: sortBy, page }).reply(404)

        const result = await remandAndSentencingService.searchCourtCases(prisonerId, 'test-username', sortBy, page)

        expect(result).toBeUndefined()
      })

      it('Should rethrow when the API responds with a non-404 error', async () => {
        const sortBy = 'DESC'
        const page = 0

        fakeApi.get('/court-case/paged/search').query({ prisonerId, pagedCourtCaseOrderBy: sortBy, page }).reply(400)

        await expect(
          remandAndSentencingService.searchCourtCases(prisonerId, 'test-username', sortBy, page),
        ).rejects.toThrow()
      })
    })
  })
})
