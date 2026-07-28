import config, { ApiConfig } from '../config'
import RestClient from './restClient'
import { CourtDocument, CourtDocumentView } from '../@types/courtDataIngestionApi/types'
import { BackfillListResponse, BackfillRunSummary, BackfillTriggerResponse } from '../model/backfill'

export default class CourtDataIngestionApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Court data ingestion API', config.apis.courtDataIngestionApi as ApiConfig, token)
  }

  async documentViewed(documentId: string, courtDocumentView: CourtDocumentView): Promise<void> {
    return this.restClient.post({
      path: `/court-document/${documentId}/view`,
      data: courtDocumentView,
    }) as Promise<void>
  }

  async markAsNew(documentId: string, courtDocumentView: CourtDocumentView): Promise<void> {
    return this.restClient.post({
      path: `/court-document/${documentId}/mark-as-new`,
      data: courtDocumentView,
    }) as Promise<void>
  }

  async getDocuments(prisonerId: string, documentIdsFromCp: string[]): Promise<CourtDocument[]> {
    return this.restClient.get({
      path: `/court-document/person/${prisonerId}?prisonDocumentIds=${documentIdsFromCp.join(',')}`,
    }) as Promise<CourtDocument[]>
  }

  async listBackfills(): Promise<BackfillListResponse> {
    return this.restClient.get({ path: '/admin/backfill' }) as Promise<BackfillListResponse>
  }

  async getBackfill(backfillId: string): Promise<BackfillRunSummary> {
    return this.restClient.get({
      path: `/admin/backfill/${encodeURIComponent(backfillId)}`,
    }) as Promise<BackfillRunSummary>
  }

  async startBackfill(backfillId: string): Promise<BackfillTriggerResponse> {
    return this.restClient.post({
      path: `/admin/backfill/${encodeURIComponent(backfillId)}`,
      data: {},
    }) as Promise<BackfillTriggerResponse>
  }
}
