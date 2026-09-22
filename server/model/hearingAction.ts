export enum HearingActionType {
  DONE = 'DONE',
  AUTOCOMPLETE = 'AUTOCOMPLETE',
  RECORD_APPEARANCE = 'RECORD_APPEARANCE',
  RECORD_CASE_AND_APPEARANCE = 'RECORD_CASE_AND_APPEARANCE',
}

export interface HearingAction {
  type: HearingActionType
  text: string
  href: string
}

export interface PersonCourtContext {
  offeredHearingIds: Set<string>
  casesByReference: Map<string, string>
  autocompleteChecked: boolean
  latestAppearanceDates?: Map<string, string>
  casesChecked?: boolean
}

export const emptyCourtContext = (): PersonCourtContext => ({
  offeredHearingIds: new Set(),
  casesByReference: new Map(),
  autocompleteChecked: false,
  latestAppearanceDates: new Map(),
  casesChecked: false,
})
