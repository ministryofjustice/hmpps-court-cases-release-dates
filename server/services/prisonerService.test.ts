import nock from 'nock'
import config from '../config'
import PrisonerService from './prisonerService'
import { OffenderSentenceAndOffences } from '../@types/prisonApi/types'
import { HmppsAuthClient } from '../data'

jest.mock('../data/hmppsAuthClient')
jest.mock('../data/tokenStore/redisTokenStore')

const hmppsAuthClient = {} as jest.Mocked<HmppsAuthClient>
const prisonerService = new PrisonerService(hmppsAuthClient)

const bookingId = 991
const sentenceAndOffenceBaseRecord = {
  terms: [
    {
      years: 3,
    },
  ],
  sentenceTypeDescription: 'SDS Standard Sentence',
  caseSequence: 1,
  lineSequence: 1,
  caseReference: 'CASE001',
  courtDescription: 'Court 1',
  sentenceSequence: 1,
  sentenceStatus: 'A',
  offences: [
    {
      offenderChargeId: 1,
      offenceDescription: 'Doing a crime',
      offenceStartDate: '2021-01-04',
      offenceEndDate: '2021-01-05',
    },
    { offenderChargeId: 2, offenceDescription: 'Doing a different crime', offenceStartDate: '2021-03-06' },
  ],
} as OffenderSentenceAndOffences

const activeSentencesAndOffences = [sentenceAndOffenceBaseRecord]
const inactiveSentencesAndOffences = [{ ...sentenceAndOffenceBaseRecord, sentenceStatus: 'I' }]

describe('Prisoner service tests', () => {
  let prisonApi: nock.Scope

  beforeEach(() => {
    config.apis.prisonApi.url = 'http://localhost:8100'
    prisonApi = nock(config.apis.prisonApi.url)
  })

  afterAll(() => {
    nock.restore()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('hasActiveSentences tests', () => {
    it('Should return true if active sentences exist', async () => {
      prisonApi
        .get(`/api/offender-sentences/booking/${bookingId}/sentences-and-offences`)
        .reply(200, activeSentencesAndOffences)
      const result = await prisonerService.hasActiveSentences(bookingId, null)
      expect(result).toStrictEqual(true)
    })

    it('Should return false if there are no active sentences', async () => {
      prisonApi
        .get(`/api/offender-sentences/booking/${bookingId}/sentences-and-offences`)
        .reply(200, inactiveSentencesAndOffences)
      const result = await prisonerService.hasActiveSentences(bookingId, null)
      expect(result).toStrictEqual(false)
    })
  })
})
