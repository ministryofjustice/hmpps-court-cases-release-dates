import { PeriodLengthLegacyData } from './remandAndSentencingTypes'

export interface SentenceLength {
  years?: string
  months?: string
  weeks?: string
  days?: string
  periodOrder: string[]
  periodLengthType:
    | 'SENTENCE_LENGTH'
    | 'CUSTODIAL_TERM'
    | 'LICENCE_PERIOD'
    | 'TARIFF_LENGTH'
    | 'TERM_LENGTH'
    | 'OVERALL_SENTENCE_LENGTH'
    | 'UNSUPPORTED'
  legacyData?: PeriodLengthLegacyData
  description?: string
  uuid: string
}
