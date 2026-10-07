import dayjs from 'dayjs'
import { PrisonCourtDocument, PrisonCourtHearing } from '../@types/courtDataIngestionApi/prisonCourtDocumentTypes'
import { HearingAction, HearingActionType } from './hearingAction'
import documentTypeText from './documentTypeText'
import config from '../config'
import {
  HmctsAutopopulateFeatureType,
  HmctsHearingAutopopulateEligibility,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

const rasUrl = () => config.applications.remandAndSentencing.url

export type ArrivalFactTone = 'neutral' | 'blocked' | 'settled'

export type ArrivalFact = {
  text: string
  tone: ArrivalFactTone
  reason?: string
}

export default class ArrivalCard {
  private constructor(
    private readonly hearing: PrisonCourtHearing | null,
    readonly prisonerNumber: string,
    private readonly references: string[],
    private readonly documentList: PrisonCourtDocument[],
    private readonly prisonCode: string,
    private readonly prisonNames: Map<string, string>,
    private readonly names: Map<string, string>,
    private readonly autocompleteEligibility: HmctsHearingAutopopulateEligibility,
  ) {}

  static forHearing(
    hearing: PrisonCourtHearing,
    prisonCode: string,
    prisonNames: Map<string, string>,
    names: Map<string, string>,
    autocompleteEligibility: HmctsHearingAutopopulateEligibility,
  ): ArrivalCard {
    return new ArrivalCard(
      hearing,
      hearing.prisonerNumber,
      hearing.caseReferences,
      hearing.documents,
      prisonCode,
      prisonNames,
      names,
      autocompleteEligibility,
    )
  }

  static forUnlinked(
    documents: PrisonCourtDocument[],
    prisonCode: string,
    prisonNames: Map<string, string>,
    names: Map<string, string>,
    autocompleteEligibility: HmctsHearingAutopopulateEligibility,
  ): ArrivalCard {
    const references = [...new Set(documents.flatMap(document => document.caseReferences))]
    return new ArrivalCard(
      null,
      documents[0].prisonerNumber,
      references,
      documents,
      prisonCode,
      prisonNames,
      names,
      autocompleteEligibility,
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

  private get hasRemandWarrant(): boolean {
    return this.documentList.some(document => document.documentType === 'REMAND_WARRANT')
  }

  private get hasSentencingWarrant(): boolean {
    return this.documentList.some(document => document.documentType === 'SENTENCING_WARRANT')
  }

  get wouldBeOffered(): boolean {
    return this.offered()
  }

  private offered(): boolean {
    return (
      this.autocompleteEligibility?.hasWarrantAndPcr &&
      (this.autocompleteEligibility?.features?.every(it => it.enabled) ?? false)
    )
  }

  get receivedAt(): string {
    return this.documentList
      .map(document => document.receivedAt)
      .sort()
      .reverse()[0]
  }

  get caseReferences(): { reference: string; caseHref: string | null }[] {
    return this.references.map(reference => {
      const courtCaseUuid = this.autocompleteEligibility?.cases?.find(
        it => it.caseReference === reference,
      )?.caseUniqueIdentifier
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

  get isDone(): boolean {
    return this.autocompleteEligibility?.hasBeenCompleted
  }

  private get hasExistingCase(): boolean {
    return this.autocompleteEligibility?.cases?.length !== 0
  }

  get facts(): ArrivalFact[] {
    const blocking = this.blockingFacts
    const facts = this.statedFacts.map(text => {
      const tone = this.toneOf(text, blocking)
      return { text, tone }
    })
    const inTone = (tone: ArrivalFactTone) => facts.filter(fact => fact.tone === tone)

    return [...inTone('blocked'), ...inTone('settled'), ...inTone('neutral')]
  }

  private toneOf(text: string, blocking: Set<string>): ArrivalFactTone {
    if (this.isDone && text === 'Existing appearance') return 'settled'
    return blocking.has(text) ? 'blocked' : 'neutral'
  }

  private get statedFacts(): string[] {
    const facts: string[] = []

    if (!this.hearing) facts.push('No HMCTS hearing')

    if (this.hasRemandWarrant) facts.push('Remand warrant')
    if (this.hasSentencingWarrant) facts.push('Sentencing warrant')
    if (!this.hasRemandWarrant && !this.hasSentencingWarrant) facts.push('No warrant')

    if (this.references.length === 0) facts.push('No case reference')
    if (this.references.length > 1) facts.push('Several cases')

    if (this.hasExistingCase) {
      facts.push('Existing case')
      if (this.isDone) facts.push('Existing appearance')
    }

    return facts
  }

  private get blockingFacts(): Set<string> {
    const blocking = new Set<string>()
    if (this.wouldBeOffered || this.isDone) return blocking

    if (!this.hearing) blocking.add('No HMCTS hearing')

    if (this.references.length === 0) blocking.add('No case reference')
    if (this.references.length > 1) blocking.add('Several cases')
    if (!this.hasRemandWarrant && !this.hasSentencingWarrant) blocking.add('No warrant')

    this.autocompleteEligibility?.features?.forEach(it => {
      if (!it.enabled) {
        const text = this.textFor(it.type)
        if (text) {
          blocking.add(text)
        }
      }
    })

    return blocking
  }

  private textFor(type: HmctsAutopopulateFeatureType): string {
    switch (type) {
      case 'MULTIPLE_CASE_REFERENCES':
        return 'Several cases'
      case 'NEW_REMAND_APPEARANCE_ON_EXISTING_CASE':
        return 'Existing case'
      case 'NEW_SENTENCING_APPEARANCE_ON_EXISTING_CASE':
        return 'Existing case'
      case 'REMAND_WARRANT':
        return 'Remand warrant'
      case 'SENTENCING_WARRANT':
        return 'Sentencing warrant'
      default:
        return null
    }
  }

  get appearanceHref(): string | null {
    if (!this.isDone || !this.hearing) return null

    const courtCase = this.references.map(reference =>
      this.autocompleteEligibility?.cases?.find(it => it.caseReference === reference),
    )
    const shown = encodeURIComponent(dayjs(this.hearing.hearingDate).format('DD/MM/YYYY'))

    return `${rasUrl()}/person/${this.prisonerNumber}/view-court-case/${courtCase}/details#:~:text=Hearing%20date-,${shown}`
  }

  get action(): HearingAction {
    const recordedCases = this.references.map(reference =>
      this.autocompleteEligibility?.cases?.find(it => it.caseReference === reference),
    )
    const everyCaseRecorded = recordedCases.length > 0 && recordedCases.every(Boolean)
    const existingCase = recordedCases.find(Boolean)

    if (this.wouldBeOffered && !this.isDone) {
      const existingCaseSegment = existingCase ? '/existing-case' : ''
      return {
        type: HearingActionType.AUTOCOMPLETE,
        text: 'Autocomplete',
        href: `${rasUrl()}/person/${this.prisonerNumber}/review-new-documents/${this.hearing!.courtHearingId}/landing${existingCaseSegment}`,
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
