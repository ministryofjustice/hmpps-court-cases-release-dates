import { components } from './index'
import expectedTypes from './documentTypes'

export type AppearanceDocument = components['schemas']['AppearanceDocument']

export class AppearanceDocumentConverter {
  static getHearingDate(document: AppearanceDocument): string {
    if (document.warrantType === 'NON_SENTENCING') return document.warrantDate
    return null
  }

  static getWarrantDate(document: AppearanceDocument): string {
    if (document.warrantType === 'SENTENCING') return document.warrantDate
    return null
  }

  static getDocumentTypeDescription(document: AppearanceDocument, documentType:string):string {
    return expectedTypes[document.warrantType as 'SENTENCING' | 'NON_SENTENCING'].find(
      type => type.type === documentType,
    ).name
  }
}