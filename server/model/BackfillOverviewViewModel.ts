import { BackfillListResponse, BackfillNotification } from './backfill'
import BackfillRow from './BackfillRow'

export default class BackfillOverviewViewModel {
  readonly rows: BackfillRow[]

  constructor(
    list: BackfillListResponse,
    readonly notification?: BackfillNotification,
  ) {
    const byId = new Map(list.recent.map(run => [run.backfillId, run]))
    this.rows = [...list.registered].sort().map(id => new BackfillRow(id, byId.get(id)))
  }

  get anyRunning(): boolean {
    return this.rows.some(row => row.isRunning)
  }
}
