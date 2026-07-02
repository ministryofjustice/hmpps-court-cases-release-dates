import { components } from './index'

export type ImmigrationDetention = components['schemas']['ImmigrationDetention']
export type RasPrisonerDocuments = components['schemas']['PrisonerDocuments']

export type ApiRecall = components['schemas']['Recall']
export type PrisonerRecallsResponse = components['schemas']['PrisonerRecallsResponse']

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
  FIFTY_SIX_DAY_FIXED_TERM_RECALL: {
    code: 'FTR_56',
    description: '56-day fixed term',
  },
} as const

// TODO revisit this.. we could use the types from the RAS api
export interface Recall {
  recallId: string
  recallDate: Date
  revocationDate: string
  createdAt: string
  returnToCustodyDate: Date
  ual: number
  recallType: RecallType
  source: 'NOMIS' | 'DPS'
  location: string
  inPrisonOnRevocationDate?: boolean
}

function getRecallType(code: string): RecallType {
  return Object.values(RecallTypes).find(it => it.code === code)
}

export { RecallTypes, getRecallType }
export type { RecallType }

export type SearchCourtCasesPage = components['schemas']['SearchCourtCasesPage']
export type SentenceConsecutiveToDetailsResponse = components['schemas']['SentenceConsecutiveToDetailsResponse']

export type Charge = components['schemas']['Charge']
export type PagedCourtCase = components['schemas']['PagedCourtCase']
export type PagedLatestCourtAppearance = components['schemas']['PagedLatestCourtAppearance']
export type PagedMergedFromCase = components['schemas']['PagedMergedFromCase']
export type PagedMergedToCase = components['schemas']['PagedMergedToCase']
export type PeriodLength = components['schemas']['PeriodLength']
export type SentenceLegacyData = components['schemas']['SentenceLegacyData']
export type PagedCharge = components['schemas']['PagedCharge']
export type PagedSentence = components['schemas']['PagedSentence']
export type PagedSentencePeriodLength = components['schemas']['PagedSentencePeriodLength']
export type SentenceConsecutiveToDetails = components['schemas']['SentenceConsecutiveToDetails']

// Client Types
export type PagedAppearancePeriodLength = components['schemas']['PagedAppearancePeriodLength']
