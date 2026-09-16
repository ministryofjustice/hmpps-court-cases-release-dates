import config, { ApiConfig } from '../config'
import RestClient from './restClient'
import { CourtDocument, CourtDocumentView } from '../@types/courtDataIngestionApi/types'
import { BackfillListResponse, BackfillRunSummary, BackfillTriggerResponse } from '../model/backfill'
import {
  ClassifyAddressPreview,
  ClassifyAddressRequest,
  ClassifyAddressResult,
  CreateCategoryRequest,
  DeliveryCategory,
  UnclassifiedAddress,
} from '../@types/courtDataIngestionApi/deliveryAddressTypes'

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

  async getDeliveryAddresses(classified: boolean, categoryCode?: string): Promise<UnclassifiedAddress[]> {
    const query = new URLSearchParams({ classified: String(classified) })
    if (categoryCode) query.set('category', categoryCode)

    return this.restClient.get({ path: `/admin/delivery-addresses?${query}` }) as Promise<UnclassifiedAddress[]>
  }

  async getDeliveryCategories(): Promise<DeliveryCategory[]> {
    return this.restClient.get({ path: '/admin/delivery-categories' }) as Promise<DeliveryCategory[]>
  }

  /** Returns 201 with no body: the API does not hand the caller its own input back. */
  async createDeliveryCategory(request: CreateCategoryRequest): Promise<void> {
    await this.restClient.post({
      path: '/admin/delivery-categories',
      data: request,
    })
  }

  async previewClassification(request: ClassifyAddressRequest): Promise<ClassifyAddressPreview> {
    return this.restClient.post({
      path: '/admin/delivery-addresses/preview',
      data: request,
    }) as Promise<ClassifyAddressPreview>
  }

  async classifyAddress(request: ClassifyAddressRequest): Promise<ClassifyAddressResult> {
    return this.restClient.post({
      path: '/admin/delivery-addresses',
      data: request,
    }) as Promise<ClassifyAddressResult>
  }
}
