import _ from 'lodash'
import { HmppsAuthClient } from '../data'
import { Prison } from '../@types/prisonRegisterApi/prisonRegisterTypes'
import PrisonRegisterApiClient from '../data/prisonRegisterApiClient'

const PRISON_CACHE_TTL_MS = 24 * 60 * 60 * 1000

export default class PrisonService {
  private allPrisons: { prisons: Prison[]; fetchedAt: number } | null = null

  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonName(prisonId: string, username: string): Promise<string> {
    const details: Prison[] = await (await this.getApiClient(username)).getPrisonDetails(prisonId)
    return _.first(details)?.prisonName ?? prisonId
  }

  async getAllPrisons(username: string): Promise<Prison[]> {
    if (this.allPrisons && Date.now() - this.allPrisons.fetchedAt < PRISON_CACHE_TTL_MS) {
      return this.allPrisons.prisons
    }

    const prisons = await (await this.getApiClient(username)).getAllPrisons()
    this.allPrisons = { prisons, fetchedAt: Date.now() }

    return prisons
  }

  private async getApiClient(username: string): Promise<PrisonRegisterApiClient> {
    return new PrisonRegisterApiClient(await this.getSystemClientToken(username))
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
