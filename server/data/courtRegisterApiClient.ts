import config, { ApiConfig } from '../config'
import RestClient from './restClient'
import { CourtDto } from '../@types/courtRegisterApi/types'

export default class CourtRegisterApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Court Register API', config.apis.courtRegisterApi as ApiConfig, token)
  }

  async findCourtById(courtCode: string): Promise<CourtDto> {
    return this.restClient.get({
      path: `/courts/id/${courtCode}`,
    }) as Promise<CourtDto>
  }
}
