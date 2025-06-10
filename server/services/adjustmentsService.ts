import { HmppsAuthClient } from '../data'
import { Adjustment, UnusedDeductionsCalculationResult } from '../@types/adjustmentsApi/types'
import AdjustmentApiClient from '../data/adjustmentsApiClient'

export default class AdjustmentsService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  public async getUnusedDeductionsCalculationResult(
    person: string,
    username: string,
  ): Promise<UnusedDeductionsCalculationResult> {
    return new AdjustmentApiClient(await this.getSystemClientToken(username)).getUnusedDeductionsCalculationResult(
      person,
    )
  }

  async getAdjustments(person: string, earliestSentenceDate: Date, username: string): Promise<Adjustment[]> {
    return new AdjustmentApiClient(await this.getSystemClientToken(username)).findByPerson(
      person,
      earliestSentenceDate?.toISOString()?.substring(0, 10),
    )
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
