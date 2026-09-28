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
  casesByReference: Map<string, string>
  latestAppearanceDates?: Map<string, string>
  casesChecked?: boolean
}

export const emptyCourtContext = (): PersonCourtContext => ({
  casesByReference: new Map(),
  latestAppearanceDates: new Map(),
  casesChecked: false,
})
