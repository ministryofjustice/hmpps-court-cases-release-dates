import { SentenceLength } from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/@types'
import {
  PagedCourtCase,
  PagedMergedFromCase,
  SentenceLegacyData,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { pagedAppearancePeriodLengthToSentenceLength, pagedChargeToOffence } from '../utils/mappingUtils'
import { orderOffences, sortByDateDesc } from '../utils/utils'

export default class CourtCasesDetailsModel {
  courtCaseUuid: string

  warrantType: string

  overallCaseOutcome: string

  overallSentenceLength: SentenceLength

  title: string

  offences: Offence[]

  sentenceTypeMap: { [key: string]: string }

  chargeTotal: number

  showingChargeTotal?: number

  constructor(pagedCourtCase: PagedCourtCase, courtMap: { [key: string]: string }) {
    this.courtCaseUuid = pagedCourtCase.courtCaseUuid
    this.warrantType = pagedCourtCase.latestCourtAppearance?.warrantType
    this.overallCaseOutcome = pagedCourtCase.latestCourtAppearance.outcome ?? 'Not entered'
    this.title = courtMap[pagedCourtCase.latestCourtAppearance?.courtCode]
    if (pagedCourtCase.latestCourtAppearance?.caseReference) {
      this.title = `${pagedCourtCase.latestCourtAppearance.caseReference} at ${this.title}`
    }
    const charges = pagedCourtCase.latestCourtAppearance?.charges
      .sort((a, b) => {
        return sortByDateDesc(b.createdAt, a.createdAt)
      })
      .slice(0, 6)
    this.overallSentenceLength = pagedAppearancePeriodLengthToSentenceLength(pagedCourtCase?.overallSentenceLength)
    this.offences = orderOffences(charges?.map((charge, index) => pagedChargeToOffence(charge, index)))
    this.sentenceTypeMap = Object.fromEntries(
      charges
        ?.filter(charge => charge.sentence?.sentenceType)
        .map(charge => [charge.sentence.sentenceType.sentenceTypeUuid, charge.sentence.sentenceType.description]) ?? [],
    )
    this.chargeTotal = pagedCourtCase.latestCourtAppearance?.charges.length
    if (this.chargeTotal > 6) {
      this.showingChargeTotal = 6
    }
  }
}

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
