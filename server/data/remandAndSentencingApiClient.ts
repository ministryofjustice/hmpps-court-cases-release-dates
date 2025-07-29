import config, { ApiConfig } from '../config'
import RestClient from './restClient'
import { ApiRecall } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

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
    console.log('--------', `getAllRecalls`)
    return this.restClient.get({
      path: `/recall/person/${prisonerId}`,
    }) as Promise<ApiRecall[]>
  }
}
