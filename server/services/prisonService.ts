import _ from 'lodash'
import { HmppsAuthClient } from '../data'
import { Prison } from '../@types/prisonRegisterApi/prisonRegisterTypes'
import PrisonRegisterApiClient from '../data/prisonRegisterApiClient'

export default class PrisonService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonName(prisonId: string, username: string): Promise<string> {
    const details: Prison[] = await (await this.getApiClient(username)).getPrisonDetails(prisonId)
    return _.first(details)?.prisonName ?? prisonId
  }

  private async getApiClient(username: string): Promise<PrisonRegisterApiClient> {
    return new PrisonRegisterApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
