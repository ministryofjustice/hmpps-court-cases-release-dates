import { BackfillRunSummary } from './backfill'
import BackfillRow from './BackfillRow'
import { BackfillTarget } from '../utils/backfillTarget'

export default class BackfillDetailViewModel {
  readonly row: BackfillRow

  constructor(
    readonly backfillId: string,
    readonly target: BackfillTarget,
    run?: BackfillRunSummary,
  ) {
    this.row = new BackfillRow(backfillId, run?.status === 'NO_RUNS' ? undefined : run)
  }

  get hasFailureReason(): boolean {
    return Boolean(this.row.failureReason)
  }
}
