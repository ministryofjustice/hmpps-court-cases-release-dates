import nock from 'nock'
import { ImmigrationDetention } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import RemandAndSentencingApiClient from './remandAndSentencingApiClient'
import config from '../config'

const IMMIGRATION_DETENTION_NLI_OBJECT: ImmigrationDetention = {
  source: 'DPS',
  immigrationDetentionUuid: 'IMM-DET-UUID-12345',
  prisonerId: 'ABC123',
  immigrationDetentionRecordType: 'NO_LONGER_OF_INTEREST',
  recordDate: '2022-06-22',
  homeOfficeReferenceNumber: 'ABC123',
  noLongerOfInterestReason: 'OTHER_REASON',
  noLongerOfInterestComment: 'Confirmed not of interest',
  createdAt: '2025-11-03T08:06:37.123Z',
}

describe('remandAndSentencingApiClient', () => {
  let fakeRemandAndSentencingApiClient: nock.Scope
  let client: RemandAndSentencingApiClient

  beforeEach(() => {
    fakeRemandAndSentencingApiClient = nock(config.apis.remandAndSentencingApi.url)
    client = new RemandAndSentencingApiClient('test-system-token')
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('Test getting immigration detention details for an prisoner', async () => {
    fakeRemandAndSentencingApiClient
      .get(`/immigration-detention/person/ABC123/latest`)
      .reply(200, IMMIGRATION_DETENTION_NLI_OBJECT)

    const result = await client.findLatestImmigrationDetentionRecordByPerson('ABC123')

    expect(result).toEqual(IMMIGRATION_DETENTION_NLI_OBJECT)
  })
})
