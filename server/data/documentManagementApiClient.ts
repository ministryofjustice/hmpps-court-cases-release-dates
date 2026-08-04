import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import {
  Document,
  DocumentSearchRequest,
  DocumentSearchResult,
  FileDownload,
} from '../@types/documentManagementApi/types'

export default class DocumentManagementApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Document Management API', config.apis.documentManagementApi, logger, authenticationClient)
  }

  async searchDocuments(documentSearchRequest: DocumentSearchRequest, username: string): Promise<DocumentSearchResult> {
    return this.post(
      {
        path: `/documents/facet/search`,
        headers: {
          'Service-Name': 'Court Case and Release Dates',
          Username: username,
        },
        data: documentSearchRequest,
      },
      asSystem(username),
    )
  }

  async getDocument(documentId: string, username: string): Promise<Document> {
    return this.get(
      {
        path: `/documents/${documentId}`,
        headers: {
          'Service-Name': 'Court Case and Release Dates',
          Username: username,
        },
      },
      asSystem(username),
    )
  }

  async downloadDocument(documentId: string, username: string): Promise<FileDownload> {
    return this.get(
      {
        path: `/documents/${documentId}/file`,
        query: {
          inline: true,
        },
        headers: {
          'Service-Name': 'Court Case and Release Dates',
          Username: username,
        },
        responseType: 'blob',
        raw: true,
      },
      asSystem(username),
    )
  }

  // TODO (CDIA-262): This request will be made redundant once facets search endpoint is available
  async getCaseReferences(prisonerId: string, username: string): Promise<string[]> {
    return this.get(
      {
        path: `/court-documents/case-references/${prisonerId}`,
        headers: {
          'Service-Name': 'Court Case and Release Dates',
          Username: username,
        },
      },
      asSystem(username),
    )
  }
}
