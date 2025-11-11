import nock from 'nock'
import { ImmigrationDetention } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import RemandAndSentencingApiClient from './remandAndSentencingApiClient'
import config from '../config'

const immigrationDetentionUuid = '123e4567-e89b-12d3-a456-426614174000'

const IMMIGRATION_DETENTION_OBJECT: ImmigrationDetention = {
  createdAt: '2025-11-03T08:06:37.123Z',
  recordDate: '2022-06-22',
  source: 'DPS',
  prisonerId: 'ABC123',
  immigrationDetentionUuid,
  immigrationDetentionRecordType: 'IS91',
  homeOfficeReferenceNumber: 'ABC123',
}

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
      .get(`/immigration-detention/person/ABC123`)
      .reply(200, [IMMIGRATION_DETENTION_OBJECT, IMMIGRATION_DETENTION_NLI_OBJECT])

    const result = await client.findImmigrationDetentionByPerson('ABC123')

    expect(result).toEqual([IMMIGRATION_DETENTION_OBJECT, IMMIGRATION_DETENTION_NLI_OBJECT])
  })
})
