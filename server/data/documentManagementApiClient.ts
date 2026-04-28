import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { DocumentSearchRequest, DocumentSearchResult, FileDownload } from '../@types/documentManagementApi/types'

export default class DocumentManagementApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Document Management API', config.apis.documentManagementApi, logger, authenticationClient)
  }

  async searchDocuments(prisonerId: string, username: string): Promise<DocumentSearchResult> {
    return this.post(
      {
        path: `/documents/search`,
        headers: {
          'Service-Name': 'Court Case and Release Dates',
          Username: username,
        },
        data: {
          documentTypes: [
            'HMCTS_WARRANT',
            'TRIAL_RECORD_SHEET',
            'INDICTMENT',
            'PRISON_COURT_REGISTER',
            'BAIL_ORDER',
            'SUSPENDED_IMPRISONMENT_ORDER',
            'NOTICE_OF_DISCONTINUANCE',
            'COMMUNITY_ORDER',
          ],
          orderBy: 'CREATED_TIME',
          orderByDirection: 'DESC',
          metadata: {
            prisonerId,
          } as unknown as Record<string, never>,
        } as DocumentSearchRequest,
      },
      asSystem(username),
    )
  }

  async downloadDocument(documentId: string, username: string): Promise<FileDownload> {
    return this.get(
      {
        path: `/documents/${documentId}/file`,
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
}
