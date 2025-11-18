import config, { ApiConfig } from '../config'
import RestClient from './restClient'
import { ApiRecall, ImmigrationDetention } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

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
    return this.restClient.get({
      path: `/recall/person/${prisonerId}`,
    }) as Promise<ApiRecall[]>
  }

  async findLatestImmigrationDetentionRecordByPerson(person: string): Promise<ImmigrationDetention> {
    return this.restClient.get({
      path: `/immigration-detention/person/${person}/latest`,
    }) as Promise<ImmigrationDetention>
  }

async getRecallById(recallId: string): Promise<ApiRecall> {
    return this.restClient.get({ path: `/recalls/${recallId}` })
  }

}
