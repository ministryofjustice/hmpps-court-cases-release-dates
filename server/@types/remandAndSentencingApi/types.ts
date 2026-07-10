import { components } from './index'
import expectedTypes from './documentTypes'
import { RasPrisonerDocuments } from './remandAndSentencingTypes'

export type AppearanceDocument = components['schemas']['AppearanceDocument']
export type RaSCourtCaseDocument = components['schemas']['CourtCaseDocuments']

export class RaSDocumentMapper {
  public static CASE_REFERENCE_NOT_ENTERED: string = 'Not entered'

  static getCaseReference(document: AppearanceDocument): string {
    return document.caseReference ? document.caseReference.toUpperCase() : this.CASE_REFERENCE_NOT_ENTERED
  }

  static getHearingDate(document: AppearanceDocument): string {
    if (document.warrantType === 'NON_SENTENCING') return document.warrantDate
    return null
  }

  static getWarrantDate(document: AppearanceDocument): string {
    if (document.warrantType === 'SENTENCING') return document.warrantDate
    return null
  }

  static getDocumentTypeDescription(document: AppearanceDocument, documentType: string): string {
    return expectedTypes[document.warrantType as 'SENTENCING' | 'NON_SENTENCING'].find(
      type => type.type === documentType,
    ).name
  }

  static collectCourtCodes(rasDocuments: RasPrisonerDocuments): string[] {
    return [
      ...new Set(
        rasDocuments.courtCaseDocuments.flatMap(caseDocument => {
          return Object.entries(caseDocument.appearanceDocumentsByType).flatMap(appearanceAndType => {
            return appearanceAndType[1].map(appearanceDocument => {
              return appearanceDocument.courtCode
            })
          })
        }),
      ),
    ]
  }
}
