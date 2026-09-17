import { SentenceLength } from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/@types'
import { PagedCourtCase } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { pagedAppearancePeriodLengthToSentenceLength, pagedChargeToOffence } from '../utils/mappingUtils'
import { orderOffences, sortByDateDesc } from '../utils/utils'
import { Offence } from './CourtCaseTypes'

export default class CourtCasesDetailsModel {
  courtCaseUuid: string

  warrantType: string

  warrantDate: string

  overallCaseOutcome: string

  overallSentenceLength: SentenceLength

  title: string

  offences: Offence[]

  sentenceTypeMap: { [key: string]: string }

  chargeTotal: number

  overallCaseStatus: string

  constructor(pagedCourtCase: PagedCourtCase, courtMap: { [key: string]: string }) {
    this.courtCaseUuid = pagedCourtCase.courtCaseUuid
    this.warrantType = pagedCourtCase.latestCourtAppearance?.warrantType
    this.warrantDate = pagedCourtCase.latestCourtAppearance?.warrantDate
    this.overallCaseOutcome = pagedCourtCase.latestCourtAppearance.outcome ?? 'Not entered'
    this.overallCaseStatus = pagedCourtCase.courtCaseStatus
    this.title = courtMap[pagedCourtCase.latestCourtAppearance?.courtCode]
    if (pagedCourtCase.latestCourtAppearance?.caseReference) {
      this.title = `${pagedCourtCase.latestCourtAppearance.caseReference} at ${this.title}`
    }
    this.chargeTotal = pagedCourtCase.latestCourtAppearance?.charges.length
    const charges = pagedCourtCase.latestCourtAppearance?.charges.sort((a, b) => {
      return sortByDateDesc(b.createdAt, a.createdAt)
    })
    this.overallSentenceLength = pagedAppearancePeriodLengthToSentenceLength(
      pagedCourtCase.latestCourtAppearance?.periodLengths?.find(
        periodLength => periodLength.type === 'OVERALL_SENTENCE_LENGTH',
      ),
    )
    this.offences = orderOffences(charges?.map((charge, index) => pagedChargeToOffence(charge, index)))
    this.sentenceTypeMap = Object.fromEntries(
      charges
        ?.filter(charge => charge.sentence?.sentenceType)
        .map(charge => [charge.sentence.sentenceType.sentenceTypeUuid, charge.sentence.sentenceType.description]) ?? [],
    )
  }
}
