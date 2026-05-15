import { components } from './index'

export interface FileDownload {
  body: Buffer
  header: {
    [key: string]: string
  }
}

export type DocumentSearchRequest = components['schemas']['DocumentSearchRequest']
export type DocumentSearchResult = components['schemas']['DocumentSearchResult']
export type Document = components['schemas']['Document']

export class DocumentManagementMapper {

  static getPrisonerId(document: Document): string {
    return document?.metadata?.prisonerId
  }
}