export type BackfillRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'NO_RUNS'

export interface BackfillRunSummary {
  backfillId: string
  runId?: string | null
  status: BackfillRunStatus
  cursor?: string | null
  processed: number
  failed: number
  startedAt?: string | null
  heartbeatAt?: string | null
  completedAt?: string | null
  triggeredBy?: string | null
  failureReason?: string | null
}

export interface BackfillListResponse {
  registered: string[]
  recent: BackfillRunSummary[]
}

export type TriggerOutcome = 'started' | 'already-running' | 'unknown-backfill' | 'error'

export interface BackfillTriggerResponse {
  runId?: string | null
  message: string
}

export interface BackfillNotification {
  type: 'success' | 'warning'
  text: string
}
