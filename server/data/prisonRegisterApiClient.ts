import config, { ApiConfig } from '../config'
import RestClient from './restClient'
import { Prison, PrisonsSearchRequest } from '../@types/prisonRegisterApi/prisonRegisterTypes'

export default class PrisonRegisterApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Prison Register API', config.apis.prisonRegisterApi as ApiConfig, token)
  }

  async getPrisonDetails(prisonId: string): Promise<Prison[]> {
    const searchObj: PrisonsSearchRequest = { prisonIds: [prisonId] }
    return this.restClient.post({
      path: `/prisons/prisonsByIds`,
      data: searchObj,
    }) as Promise<Prison[]>
  }
}
