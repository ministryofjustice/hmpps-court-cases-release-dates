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
    private readonly names: Map<string, string>,
  ) {}

  static forHearing(
    hearing: PrisonCourtHearing,
    prisonCode: string,
    context: PersonCourtContext,
    prisonNames: Map<string, string>,
    names: Map<string, string>,
  ): ArrivalCard {
    return new ArrivalCard(
      hearing,
      hearing.prisonerNumber,
      hearing.caseReferences,
      hearing.documents,
      prisonCode,
      context,
      prisonNames,
      names,
    )
  }

  static forUnlinked(
    documents: PrisonCourtDocument[],
    prisonCode: string,
    context: PersonCourtContext,
    prisonNames: Map<string, string>,
    names: Map<string, string>,
  ): ArrivalCard {
    const references = [...new Set(documents.flatMap(document => document.caseReferences))]
    return new ArrivalCard(
      null,
      documents[0].prisonerNumber,
      references,
      documents,
      prisonCode,
      context,
      prisonNames,
      names,
    )
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

  /** The documents on the card named together, as the heading of the block. */
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

  get personName(): string | null {
    return this.names.get(this.prisonerNumber) ?? null
  }

  get personHref(): string {
    return `/prisoner/${this.prisonerNumber}/overview`
  }

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

  get facts(): string[] {
    const facts: string[] = []

    if (!this.hearing) facts.push('No HMCTS hearing')

    const types = this.documentList.map(document => document.documentType)
    if (types.includes('REMAND_WARRANT')) facts.push('Remand warrant')
    if (types.includes('SENTENCING_WARRANT')) facts.push('Sentencing warrant')
    if (!types.some(type => WARRANTS.includes(type))) facts.push('No warrant')

    if (this.references.length === 0) facts.push('No case reference')
    if (this.references.length > 1) facts.push('Several case references')

    if (!this.context.autocompleteChecked) {
      facts.push('Remand and sentencing not checked')
    } else if (this.references.some(reference => this.context.casesByReference.has(reference))) {
      facts.push('Existing case reference')
      if (this.isDone) facts.push('Existing appearance')
    }

    return facts
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
