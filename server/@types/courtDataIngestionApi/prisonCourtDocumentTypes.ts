export interface PrisonCourtDocumentDayCount {
  date: string
  documents: number
  people: number
}

export interface PrisonCourtDocument {
  prisonDocumentId: string
  prisonerNumber: string
  documentType: string
  caseReferences: string[]
  addressedPrison?: string
  receivedAt: string
}

export interface PrisonCourtHearing {
  courtHearingId: string
  prisonerNumber: string
  hearingDate: string
  hearingType: string
  courtName: string
  caseReferences: string[]
  receivedAt: string
  documents: PrisonCourtDocument[]
}

export interface PrisonCourtDocumentWeek {
  prisonCode: string
  from: string
  to: string
  rollSize: number
  days: PrisonCourtDocumentDayCount[]
  totalDocuments: number
  documents?: PrisonCourtDocument[]
  previousWeek: string
  nextWeek?: string
}

export interface PrisonCourtPerson {
  prisonerNumber: string
  firstName?: string
  lastName?: string
}

export interface PrisonCourtDocumentDay {
  prisonCode: string
  date: string
  rollSize: number
  hearings: PrisonCourtHearing[]
  documentsWithoutAHearing: PrisonCourtDocument[]
  people: PrisonCourtPerson[]
}
