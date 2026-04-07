import { components } from './index'

export interface FileDownload {
  body: Buffer
  header: {
    [key: string]: string
  }
}

export type DocumentSearchRequest = components['schemas']['DocumentSearchRequest']
export type DocumentSearchResult = components['schemas']['DocumentSearchResult']
