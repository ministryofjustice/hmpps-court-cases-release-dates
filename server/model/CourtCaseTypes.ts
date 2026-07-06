import { SentenceLength } from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/@types'
import { PagedMergedFromCase, SentenceLegacyData } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export interface Offence {
  offenceStartDate?: Date
  offenceEndDate?: Date
  offenceCode?: string
  outcomeUuid?: string
  chargeUuid: string
  sentence?: Sentence
  terrorRelated?: boolean
  foreignPowerRelated?: boolean
  legacyData?: Record<string, never>
  updatedOutcome?: boolean
  mergedFromCase?: PagedMergedFromCase
  onFinishGoToEdit?: boolean
  replacesOffenceUuid?: string
  createChargeOrder?: number
  replicatedFromUuid?: string
  offenceDateIsSame?: string
}

export interface Sentence {
  sentenceUuid: string
  countNumber?: string
  hasCountNumber?: string
  periodLengths?: SentenceLength[]
  sentenceServeType?: string
  sentenceTypeId?: string
  sentenceTypeClassification?: string
  convictionDate?: Date
  fineAmount?: number
  legacyData?: SentenceLegacyData
  isSentenceConsecutiveToAnotherCase?: string
  consecutiveToSentenceUuid?: string
  returnUrlKey?: string
}
