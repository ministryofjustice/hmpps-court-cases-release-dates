import config, { ApiConfig } from '../config'
import RestClient from './restClient'
import {
  ApiRecall,
  ImmigrationDetention,
  PrisonerRecallsResponse,
  RasPrisonerDocuments,
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
}
