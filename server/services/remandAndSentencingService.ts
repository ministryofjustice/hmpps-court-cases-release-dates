import { addDays, compareDesc, differenceInCalendarDays, isEqual, parse } from 'date-fns'
import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import { ApiRecall, getRecallType, Recall } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class RemandAndSentencingService {
  async getMostRecentRecall(nomsId: string, token: string): Promise<Recall> {
    const client = new RemandAndSentencingApiClient(token)
    const allApiRecalls = await client.getAllRecalls(nomsId)

    allApiRecalls.sort((a, b) => compareDesc(a.revocationDate, b.revocationDate))

    const mostRecent: ApiRecall = allApiRecalls.find(Boolean)
    const ual = mostRecent ? this.calculateUal(mostRecent.revocationDate, mostRecent.returnToCustodyDate) : null
    return mostRecent
      ? {
          recallId: mostRecent.recallUuid,
          recallDate: mostRecent.revocationDate ? new Date(mostRecent.revocationDate) : null,
          returnToCustodyDate: mostRecent.returnToCustodyDate ? new Date(mostRecent.returnToCustodyDate) : null,
          recallType: getRecallType(mostRecent.recallType),
          // TODO UAL should be stored on the recall in RaS not calculated on the fly
          ual,
          ualString: `${ual} day${ual === 1 ? '' : 's'}`,
          location: mostRecent.createdByPrison,
        }
      : undefined
  }

  private calculateUal(
    recallDate: string | Date | null | undefined,
    returnToCustodyDate?: string | Date | null,
  ): number {
    if (!recallDate || !returnToCustodyDate || isEqual(recallDate, returnToCustodyDate)) {
      return 0
    }

    let parsedRecall: Date
    try {
      parsedRecall = recallDate instanceof Date ? recallDate : parse(recallDate, 'yyyy-MM-dd', new Date())
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error parsing recallDate:', recallDate, err)
      return 0
    }

    return differenceInCalendarDays(
      returnToCustodyDate instanceof Date ? returnToCustodyDate : parse(returnToCustodyDate, 'yyyy-MM-dd', new Date()),
      addDays(parsedRecall, 1),
    )
  }
}
