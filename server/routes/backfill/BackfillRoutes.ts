import { RequestHandler } from 'express'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import BackfillOverviewViewModel from '../../model/BackfillOverviewViewModel'
import { BackfillNotification } from '../../model/backfill'

export default class BackfillRoutes {
  constructor(private readonly courtDataIngestionService: CourtDataIngestionService) {}

  public overview: RequestHandler = async (req, res) => {
    const { token } = res.locals.user
    const list = await this.courtDataIngestionService.listBackfills(token)

    return res.render('pages/backfill/index', {
      model: new BackfillOverviewViewModel(list, this.notificationFrom(req.query)),
    })
  }

  public start: RequestHandler = async (req, res) => {
    const { token } = res.locals.user
    const { backfillId } = req.params

    const result = await this.courtDataIngestionService.startBackfill(backfillId, token)

    return res.redirect(`/backfills?outcome=${result.outcome}&id=${encodeURIComponent(backfillId)}`)
  }

  private notificationFrom(query: Record<string, unknown>): BackfillNotification | undefined {
    const outcome = query.outcome as string
    const backfillId = query.id as string
    if (!outcome || !backfillId) return undefined

    switch (outcome) {
      case 'started':
        return { type: 'success', text: `${backfillId} started` }
      case 'already-running':
        return { type: 'warning', text: `${backfillId} was not started because a run is already in flight` }
      case 'unknown-backfill':
        return { type: 'warning', text: `${backfillId} is not a registered backfill` }
      default:
        return undefined
    }
  }
}
