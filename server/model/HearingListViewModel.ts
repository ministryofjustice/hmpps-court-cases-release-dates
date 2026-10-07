import { PrisonCourtDocument, PrisonCourtHearing } from '../@types/courtDataIngestionApi/prisonCourtDocumentTypes'
import { HearingActionType } from './hearingAction'
import ArrivalCard from './ArrivalCard'
import { HmctsHearingAutopopulateEligibility } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class HearingListViewModel {
  readonly cards: ArrivalCard[]

  constructor(
    hearings: PrisonCourtHearing[],
    documentsWithoutAHearing: PrisonCourtDocument[],
    prisonCode: string,
    prisonNames: Map<string, string> = new Map(),
    names: Map<string, string> = new Map(),
    autocompleteEligibilty: HmctsHearingAutopopulateEligibility[] = [],
  ) {
    const eligibiltyFor = (prisonerNumber: string, hearingId: string) =>
      autocompleteEligibilty.find(it => it.prisonerNumber === prisonerNumber && it.hearingId === hearingId)

    const unlinkedGroups = new Map<string, PrisonCourtDocument[]>()
    documentsWithoutAHearing.forEach(document => {
      const key = `${document.prisonerNumber}|${[...document.caseReferences].sort().join(',')}`
      unlinkedGroups.set(key, [...(unlinkedGroups.get(key) ?? []), document])
    })

    this.cards = [
      ...hearings.map(hearing =>
        ArrivalCard.forHearing(
          hearing,
          prisonCode,
          prisonNames,
          names,
          eligibiltyFor(hearing.prisonerNumber, hearing.courtHearingId),
        ),
      ),
      ...[...unlinkedGroups.values()].map(documents =>
        ArrivalCard.forUnlinked(documents, prisonCode, prisonNames, names, null),
      ),
    ].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  }

  get isEmpty(): boolean {
    return this.cards.length === 0
  }

  private count(type: HearingActionType): number {
    return this.cards.filter(card => card.action.type === type).length
  }

  get doneCount(): number {
    return this.count(HearingActionType.DONE)
  }

  get autocompleteCount(): number {
    return this.count(HearingActionType.AUTOCOMPLETE)
  }

  get byHandCount(): number {
    return this.cards.length - this.doneCount - this.autocompleteCount
  }
}
