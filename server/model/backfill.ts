export type BackfillRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'NO_RUNS'

export interface BackfillRunSummary {
  backfillId: string
  runId?: string
  status: BackfillRunStatus
  cursor?: string
  processed: number
  failed: number
  startedAt?: string
  heartbeatAt?: string
  completedAt?: string
  triggeredBy?: string
  failureReason?: string
}

export interface BackfillListResponse {
  registered: string[]
  recent: BackfillRunSummary[]
}

export type TriggerOutcome = 'started' | 'already-running' | 'unknown-backfill' | 'error'

export interface BackfillTriggerResponse {
  runId?: string
  message: string
}

export interface BackfillNotification {
  type: 'success' | 'warning'
  text: string
}
