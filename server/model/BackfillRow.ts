import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { BackfillRunStatus, BackfillRunSummary } from './backfill'

dayjs.extend(relativeTime)

// A run that finished with failed items is COMPLETED as far as CDIA is concerned, which reads
// as "fine" when it is not.
export type BackfillDisplayStatus = BackfillRunStatus | 'COMPLETED_WITH_ERRORS'

const TAG_CLASSES: Record<BackfillDisplayStatus, string> = {
  RUNNING: 'govuk-tag--blue',
  COMPLETED: 'govuk-tag--green',
  COMPLETED_WITH_ERRORS: 'govuk-tag--yellow',
  FAILED: 'govuk-tag--red',
  NO_RUNS: 'govuk-tag--grey',
}

const TAG_TEXT: Record<BackfillDisplayStatus, string> = {
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  COMPLETED_WITH_ERRORS: 'Completed with errors',
  FAILED: 'Failed',
  NO_RUNS: 'Never run',
}

export default class BackfillRow {
  constructor(
    readonly backfillId: string,
    private readonly run?: BackfillRunSummary,
  ) {}

  get status(): BackfillDisplayStatus {
    const status = this.run?.status ?? 'NO_RUNS'
    if (status === 'COMPLETED' && this.failed > 0) return 'COMPLETED_WITH_ERRORS'
    return status
  }

  get statusText(): string {
    return TAG_TEXT[this.status]
  }

  get statusClass(): string {
    return TAG_CLASSES[this.status]
  }

  get isRunning(): boolean {
    return this.status === 'RUNNING'
  }

  get hasRun(): boolean {
    return this.run !== undefined
  }

  get processed(): string {
    return (this.run?.processed ?? 0).toLocaleString('en-GB')
  }

  get failed(): number {
    return this.run?.failed ?? 0
  }

  get failedDisplay(): string {
    return this.failed.toLocaleString('en-GB')
  }

  get runId(): string | undefined {
    return this.run?.runId
  }

  get cursor(): string | undefined {
    return this.run?.cursor
  }

  get startedAt(): string | undefined {
    return this.run?.startedAt
  }

  get heartbeatAt(): string | undefined {
    return this.run?.heartbeatAt
  }

  get completedAt(): string | undefined {
    return this.run?.completedAt
  }

  get triggeredBy(): string {
    return this.run?.triggeredBy ?? 'Not recorded'
  }

  get failureReason(): string | undefined {
    return this.run?.failureReason
  }

  get lastRunAt(): string | undefined {
    return this.completedAt ?? this.startedAt
  }

  get lastRun(): string {
    if (!this.lastRunAt) return 'Never'
    return dayjs(this.lastRunAt).fromNow()
  }
}
