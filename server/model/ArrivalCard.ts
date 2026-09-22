import { PrisonCourtDocument, PrisonCourtHearing } from '../@types/courtDataIngestionApi/prisonCourtDocumentTypes'
import { HearingAction, HearingActionType, PersonCourtContext } from './hearingAction'
import documentTypeText from './documentTypeText'
import config from '../config'

const rasUrl = () => config.applications.remandAndSentencing.url

const WARRANTS = ['REMAND_WARRANT', 'SENTENCING_WARRANT']

export default class ArrivalCard {
  private constructor(
    private readonly hearing: PrisonCourtHearing | null,
    readonly prisonerNumber: string,
    private readonly references: string[],
    private readonly documentList: PrisonCourtDocument[],
    private readonly prisonCode: string,
    private readonly context: PersonCourtContext,
    private readonly prisonNames: Map<string, string>,
  ) {}

  static forHearing(
    hearing: PrisonCourtHearing,
    prisonCode: string,
    context: PersonCourtContext,
    prisonNames: Map<string, string>,
  ): ArrivalCard {
    return new ArrivalCard(
      hearing,
      hearing.prisonerNumber,
      hearing.caseReferences,
      hearing.documents,
      prisonCode,
      context,
      prisonNames,
    )
  }

  static forUnlinked(
    documents: PrisonCourtDocument[],
    prisonCode: string,
    context: PersonCourtContext,
    prisonNames: Map<string, string>,
  ): ArrivalCard {
    const references = [...new Set(documents.flatMap(document => document.caseReferences))]
    return new ArrivalCard(null, documents[0].prisonerNumber, references, documents, prisonCode, context, prisonNames)
  }

  get hasHearing(): boolean {
    return this.hearing !== null
  }

  get courtName(): string | null {
    return this.hearing?.courtName ?? null
  }

  get hearingDate(): string | null {
    return this.hearing?.hearingDate ?? null
  }

  get hearingType(): string | null {
    return this.hearing?.hearingType ?? null
  }

  get heading(): string {
    const types = [...new Set(this.documentList.map(document => documentTypeText(document.documentType)))]
    return types.length === 1
      ? types[0]
      : `${types.slice(0, -1).join(', ')} and ${types[types.length - 1].toLowerCase()}`
  }

  get documentCount(): number {
    return this.documentList.length
  }

  get canAutocomplete(): boolean {
    return this.action.type === HearingActionType.AUTOCOMPLETE
  }

  get receivedAt(): string {
    return this.documentList
      .map(document => document.receivedAt)
      .sort()
      .reverse()[0]
  }

  get caseReferences(): { reference: string; caseHref: string | null }[] {
    return this.references.map(reference => {
      const courtCaseUuid = this.context.casesByReference.get(reference)
      return {
        reference,
        caseHref: courtCaseUuid
          ? `${rasUrl()}/person/${this.prisonerNumber}/view-court-case/${courtCaseUuid}/details`
          : null,
      }
    })
  }

  get documentsHref(): string {
    const filter = this.references[0] ? `?byCaseReference=${encodeURIComponent(this.references[0])}` : ''
    return `/prisoner/${this.prisonerNumber}/documents${filter}`
  }

  get personHref(): string {
    return `/prisoner/${this.prisonerNumber}/overview`
  }

  /** Only when the documents went to another prison: otherwise it is the same on every entry. */
  get addressedElsewhere(): string | null {
    const addressed = this.documentList.find(it => it.addressedPrison)?.addressedPrison
    if (!addressed || addressed === this.prisonCode) return null
    return this.prisonNames.get(addressed) ?? addressed
  }

  get courtCase(): string {
    const recorded = this.references.filter(reference => this.context.casesByReference.has(reference)).length

    if (this.references.length === 0) return 'Not known'
    if (this.references.length === 1) return recorded === 1 ? 'Recorded' : 'Not recorded'
    if (recorded === this.references.length) return 'All recorded'
    return recorded === 0 ? 'None recorded' : 'Some recorded'
  }

  get isDone(): boolean {
    if (!this.hearing || this.references.length === 0) return false
    return this.references.every(reference => {
      const courtCase = this.context.casesByReference.get(reference)
      return courtCase !== undefined && this.context.latestAppearanceDates?.get(courtCase) === this.hearing!.hearingDate
    })
  }

  get noAutocompleteBecause(): string | null {
    if (this.canAutocomplete || this.isDone) return null

    if (!this.context.autocompleteChecked) {
      return 'Autocomplete not checked: remand and sentencing could not be asked about this person.'
    }

    return `Record manually: ${this.manualBecause}.`
  }

  private get manualBecause(): string {
    if (!this.hearing) return 'the documents are not linked to a hearing'
    if (!this.documentList.some(document => WARRANTS.includes(document.documentType))) return 'no warrant arrived'
    if (this.references.length > 1) return 'the hearing has more than one case reference'
    if (this.references.length === 0) return 'the hearing has no case reference'
    return 'remand and sentencing is not offering this hearing'
  }

  get action(): HearingAction {
    const recordedCases = this.references.map(reference => this.context.casesByReference.get(reference))
    const everyCaseRecorded = recordedCases.length > 0 && recordedCases.every(Boolean)
    const existingCase = recordedCases.find(Boolean)

    if (this.hearing && this.context.offeredHearingIds.has(this.hearing.courtHearingId)) {
      const caseSegment = existingCase ? `/${existingCase}` : ''
      return {
        type: HearingActionType.AUTOCOMPLETE,
        text: 'Autocomplete',
        href: `${rasUrl()}/person/${this.prisonerNumber}/review-new-documents/${this.hearing.courtHearingId}/start${caseSegment}`,
      }
    }

    if (this.isDone) {
      return {
        type: HearingActionType.DONE,
        text: 'View case',
        href: `${rasUrl()}/person/${this.prisonerNumber}/view-court-case/${existingCase}/details`,
      }
    }

    if (everyCaseRecorded) {
      return {
        type: HearingActionType.RECORD_APPEARANCE,
        text: 'Record appearance',
        href: `${rasUrl()}/person/${this.prisonerNumber}/view-court-case/${existingCase}/details`,
      }
    }

    return {
      type: HearingActionType.RECORD_CASE_AND_APPEARANCE,
      text: 'Record case and appearance',
      href: `${rasUrl()}/person/${this.prisonerNumber}`,
    }
  }
}
