import { Readable } from 'stream'
import { components } from './index'
import expectedTypes from '../remandAndSentencingApi/documentTypes'

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
  public static SOURCE_COMMON_PLATFORM: string = 'Common platform'

  public static SOURCE_COURT_CASE: string = 'Court cases'

  static getPrisonerId(document: Document): string {
    return document?.metadata?.prisonerId
  }

  public static getTypeDescription(it: Document) {
    return [...expectedTypes.NON_SENTENCING, ...expectedTypes.SENTENCING].find(type => type.type === it.documentType)
      .name
  }

  public static getSource(it: Document) {
    return it.metadata.source === 'court-data-ingestion-api' ? this.SOURCE_COMMON_PLATFORM : this.SOURCE_COURT_CASE
  }

  static getDownloadHeaders(file: FileDownload) {
    const headers: Map<string, string> = new Map()

    if (file.header['content-disposition']) headers.set('content-disposition', file.header['content-disposition'])

    if (file.header['content-length']) headers.set('content-length', file.header['content-length'])

    if (file.header['content-type']) headers.set('content-type', file.header['content-type'])

    return headers
  }

  static getFileStreamForClient(file: FileDownload, documentId: string): Readable {
    let fileStream: Readable

    if (file.body instanceof Readable) {
      fileStream = file.body
    } else if (Buffer.isBuffer(file.body)) {
      fileStream = new Readable()
      fileStream.push(file.body)
      fileStream.push(null)
    } else {
      throw new Error(`Unexpected body type for documentId=${documentId}`)
    }

    return fileStream
  }
}
