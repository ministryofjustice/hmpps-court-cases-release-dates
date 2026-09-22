import { PrisonCourtDocument, PrisonCourtHearing } from '../@types/courtDataIngestionApi/prisonCourtDocumentTypes'
import { emptyCourtContext, HearingActionType, PersonCourtContext } from './hearingAction'
import ArrivalCard from './ArrivalCard'

export default class HearingListViewModel {
  readonly cards: ArrivalCard[]

  constructor(
    hearings: PrisonCourtHearing[],
    documentsWithoutAHearing: PrisonCourtDocument[],
    prisonCode: string,
    private readonly contextByPrisoner: Map<string, PersonCourtContext>,
    prisonNames: Map<string, string> = new Map(),
  ) {
    const contextFor = (prisonerNumber: string) => contextByPrisoner.get(prisonerNumber) ?? emptyCourtContext()

    const unlinkedGroups = new Map<string, PrisonCourtDocument[]>()
    documentsWithoutAHearing.forEach(document => {
      const key = `${document.prisonerNumber}|${[...document.caseReferences].sort().join(',')}`
      unlinkedGroups.set(key, [...(unlinkedGroups.get(key) ?? []), document])
    })

    this.cards = [
      ...hearings.map(hearing =>
        ArrivalCard.forHearing(hearing, prisonCode, contextFor(hearing.prisonerNumber), prisonNames),
      ),
      ...[...unlinkedGroups.values()].map(documents =>
        ArrivalCard.forUnlinked(documents, prisonCode, contextFor(documents[0].prisonerNumber), prisonNames),
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

  get uncheckedPeople(): number {
    return [...this.contextByPrisoner.values()].filter(
      context => !context.autocompleteChecked || context.casesChecked === false,
    ).length
  }
}
