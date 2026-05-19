import { components } from './index'
import { Readable } from 'stream'

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
