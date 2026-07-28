import { BackfillRunStatus, BackfillRunSummary } from './backfill'

const TAG_CLASSES: Record<BackfillRunStatus, string> = {
  RUNNING: 'govuk-tag--blue',
  COMPLETED: 'govuk-tag--green',
  FAILED: 'govuk-tag--red',
  NO_RUNS: 'govuk-tag--grey',
}

const TAG_TEXT: Record<BackfillRunStatus, string> = {
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  NO_RUNS: 'Never run',
}

export default class BackfillRow {
  constructor(
    readonly backfillId: string,
    private readonly run?: BackfillRunSummary,
  ) {}

  get status(): BackfillRunStatus {
    return this.run?.status ?? 'NO_RUNS'
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

  get processed(): number {
    return this.run?.processed ?? 0
  }

  get failed(): number {
    return this.run?.failed ?? 0
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

  get triggeredBy(): string | undefined {
    return this.run?.triggeredBy
  }

  get failureReason(): string | undefined {
    return this.run?.failureReason
  }
}
