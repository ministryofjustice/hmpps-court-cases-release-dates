import { components } from './index'

export type ApiRecall = components['schemas']['Recall']

type RecallType = { code: string; description: string }

const RecallTypes = {
  STANDARD_RECALL: { code: 'LR', description: 'Standard' },
  FOURTEEN_DAY_FIXED_TERM_RECALL: {
    code: 'FTR_14',
    description: '14-day fixed term',
  },
  TWENTY_EIGHT_DAY_FIXED_TERM_RECALL: {
    code: 'FTR_28',
    description: '28-day fixed term',
  },
  HDC_STANDARD_RECALL: { code: 'LR_HDC', description: 'Standard recall from HDC' },
  HDC_FOURTEEN_DAY_RECALL: {
    code: 'FTR_HDC_14',
    description: '14-day fixed term from HDC',
  },
  HDC_TWENTY_EIGHT_DAY_RECALL: {
    code: 'FTR_HDC_28',
    description: '28-day fixed term from HDC',
  },
  HDC_CURFEW_VIOLATION_RECALL: {
    code: 'CUR_HDC',
    description: 'HDC recalled from curfew conditions',
  },
  HDC_INABILITY_TO_MONITOR_RECALL: {
    code: 'IN_HDC',
    description: 'HDC recalled from inability to monitor',
  },
} as const

export interface Recall {
  recallId: string
  recallDate: Date
  returnToCustodyDate: Date
  ual: number
  ualString: string
  recallType: RecallType
  location: string
}

function getRecallType(code: string): RecallType {
  return Object.values(RecallTypes).find(it => it.code === code)
}

export { RecallTypes, RecallType, getRecallType }
