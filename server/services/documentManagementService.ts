import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import DocumentManagementApiClient from '../data/documentManagementApiClient'
import { DocumentSearchRequest, DocumentSearchResult, FileDownload } from '../@types/documentManagementApi/types'

export default class DocumentManagementService {
  constructor(private readonly hmppsAuthClient: AuthenticationClient) {}

  async searchDocument(documentSearchRequest: DocumentSearchRequest, username: string): Promise<DocumentSearchResult> {
    return new DocumentManagementApiClient(this.hmppsAuthClient).searchDocuments(documentSearchRequest, username)
  }

  async downloadDocument(documentId: string, username: string): Promise<FileDownload> {
    return new DocumentManagementApiClient(this.hmppsAuthClient).downloadDocument(documentId, username)
  }
}
