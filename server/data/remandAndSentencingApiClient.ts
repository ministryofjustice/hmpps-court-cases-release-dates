import config, { ApiConfig } from '../config'
import RestClient from './restClient'
import {
  ApiRecall,
  ImmigrationDetention,
  PrisonerRecallsResponse,
  RasPrisonerDocuments,
  SearchCourtCasesPage,
  SentenceConsecutiveToDetailsResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class RemandAndSentencingApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient(
      'Remand and sentencing API',
      config.apis.remandAndSentencingApi as ApiConfig,
      token,
    )
  }

  async getAllRecalls(prisonerId: string): Promise<ApiRecall[]> {
    const response = await this.restClient.get<PrisonerRecallsResponse>({
      path: `/recall/person/${prisonerId}/search`,
    })
    return response.recalls
  }

  async findLatestImmigrationDetentionRecordByPerson(person: string): Promise<ImmigrationDetention> {
    return this.restClient.get({
      path: `/immigration-detention/person/${person}/latest`,
    }) as Promise<ImmigrationDetention>
  }

  async getDocuments(person: string): Promise<RasPrisonerDocuments> {
    return this.restClient.get({
      path: `/person/${person}/documents`,
    }) as Promise<RasPrisonerDocuments>
  }

  async consecutiveToDetails(sentenceUuids: string[]): Promise<SentenceConsecutiveToDetailsResponse> {
    return (await this.restClient.get({
      path: '/sentence/consecutive-to-details',
      query: {
        sentenceUuids: sentenceUuids.join(','),
      },
    })) as unknown as Promise<SentenceConsecutiveToDetailsResponse>
  }

  async searchCourtCases(prisonerId: string, sortBy: string, page: number): Promise<SearchCourtCasesPage> {
    return this.restClient.get({
      path: `/court-case/paged/search`,
      query: {
        prisonerId,
        pagedCourtCaseOrderBy: sortBy,
        page,
      },
    })
  }
}
