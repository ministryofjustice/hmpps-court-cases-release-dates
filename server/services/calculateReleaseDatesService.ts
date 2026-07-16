import {
  LatestCalculationCardConfig,
  LatestCalculationCardDate,
  LatestCalculationCardDateHint,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/@types'
import { LatestCalculation } from '../@types/calculateReleaseDatesApi/types'
import CalculateReleaseDatesApiClient from '../data/calculateReleaseDatesApiClient'
import logger from '../../logger'
import { HmppsAuthClient } from '../data'

export default class CalculateReleaseDatesService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getLatestCalculationForPrisonerAsSystem(
    prisonerNumber: string,
    username: string,
  ): Promise<LatestCalculationCardConfig> {
    return this.getLatestCalculationForPrisoner(prisonerNumber, await this.getSystemClientToken(username))
  }

  async getLatestCalculationForPrisoner(prisonerNumber: string, token: string): Promise<LatestCalculationCardConfig> {
    try {
      const latestCalculation = await new CalculateReleaseDatesApiClient(token).getLatestCalculationForPrisoner(
        prisonerNumber,
      )
      return this.latestCalculationComponentConfig(latestCalculation)
    } catch (error) {
      logger.error(error)
      return undefined
    }
  }

  async hasIndeterminateSentences(bookingId: number, token: string): Promise<boolean> {
    return new CalculateReleaseDatesApiClient(token).hasIndeterminateSentences(bookingId)
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  private latestCalculationComponentConfig(latestCalculation: LatestCalculation): LatestCalculationCardConfig {
    const dates: LatestCalculationCardDate[] = Object.values(latestCalculation.dates).map(date => {
      const cardDate: LatestCalculationCardDate = {
        type: date.type,
        description: date.description,
        date: date.date,
        hints: date.hints.map(hint => {
          const cardHint: LatestCalculationCardDateHint = {
            text: hint.text,
            href: hint.link,
          }
          return cardHint
        }),
      }
      return cardDate
    })
    return {
      source: latestCalculation.source,
      calculatedAt: latestCalculation.calculatedAt,
      establishment: latestCalculation.establishment,
      reason: latestCalculation.reason,
      dates,
    }
  }
}
