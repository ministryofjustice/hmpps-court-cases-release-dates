import { SentenceLength } from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/@types'
import { PagedCourtCase } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { pagedAppearancePeriodLengthToSentenceLength, pagedChargeToOffence } from '../utils/mappingUtils'
import { orderOffences, sortByDateDesc } from '../utils/utils'
import { Offence } from './CourtCaseTypes'

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
