import { Adjustment, UnusedDeductionsCalculationResult } from '../@types/adjustmentsApi/types'
import config, { ApiConfig } from '../config'
import RestClient from './restClient'

export default class AdjustmentApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Adjustments API Client', config.apis.adjustmentsApi as ApiConfig, token)
  }

  async getUnusedDeductionsCalculationResult(person: string): Promise<UnusedDeductionsCalculationResult> {
    return this.restClient.get({
      path: `/adjustments/person/${person}/unused-deductions-result`,
    }) as Promise<UnusedDeductionsCalculationResult>
  }

  async findByPerson(person: string, earliestSentenceDate?: string): Promise<Adjustment[]> {
    let url = `/adjustments?person=${person}`
    if (earliestSentenceDate) {
      url += `&sentenceEnvelopeDate=${earliestSentenceDate}`
    }
    return this.restClient.get({
      path: url,
    }) as Promise<Adjustment[]>
  }
}
