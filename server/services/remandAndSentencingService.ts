import { addDays, compareDesc, differenceInCalendarDays, isEqual, parse } from 'date-fns'
import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import {
  ApiRecall,
  getRecallType,
  ImmigrationDetention,
  Recall,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { HmppsAuthClient } from '../data'
import logger from '../../logger'

export default class RemandAndSentencingService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  public async getLatestImmigrationDetentionRecordForPrisoner(
    prisonerId: string,
    username: string,
  ): Promise<ImmigrationDetention | undefined> {
    const client = new RemandAndSentencingApiClient(await this.getSystemClientToken(username))
    try {
      return await client.findLatestImmigrationDetentionRecordByPerson(prisonerId)
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'status' in error) {
        const { status } = error as { status: number }
        if (status === 404) {
          logger.info('No Immigration Detention record found for prisonerId %s', prisonerId)
          return undefined
        }
      }
      throw error
    }
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  async getMostRecentRecall(nomsId: string, token: string): Promise<Recall> {
    const client = new RemandAndSentencingApiClient(token)
    const allApiRecalls = await client.getAllRecalls(nomsId)

    allApiRecalls.sort((a, b) => compareDesc(a.revocationDate, b.revocationDate))

    const mostRecent: ApiRecall = allApiRecalls.find(Boolean)
    return mostRecent
      ? {
          recallId: mostRecent.recallUuid,
          recallDate: mostRecent.revocationDate ? new Date(mostRecent.revocationDate) : null,
          createdAt: mostRecent.createdAt,
          revocationDate: mostRecent.revocationDate,
          returnToCustodyDate: mostRecent.returnToCustodyDate ? new Date(mostRecent.returnToCustodyDate) : null,
          recallType: getRecallType(mostRecent.recallType),
          source: mostRecent.source,
          ual: mostRecent.ual?.days,
          location: mostRecent.createdByPrison,
        }
      : undefined
  }
}
