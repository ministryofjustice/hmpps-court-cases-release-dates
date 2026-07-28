import { CourtDocument, CourtDocumentView } from '../@types/courtDataIngestionApi/types'
import { HmppsAuthClient } from '../data'
import CourtDataIngestionApiClient from '../data/courtDataIngestionApiClient'
import { BackfillListResponse, BackfillRunSummary, TriggerOutcome } from '../model/backfill'
import logger from '../../logger'

export interface StartBackfillResult {
  outcome: TriggerOutcome
  message: string
  runId?: string
}

export default class CourtDataIngestionService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  public async documentViewed(
    documentId: string,
    courtDocumentView: CourtDocumentView,
    username: string,
  ): Promise<void> {
    return new CourtDataIngestionApiClient(await this.getSystemClientToken(username)).documentViewed(
      documentId,
      courtDocumentView,
    )
  }

  public async markAsNew(documentId: string, courtDocumentView: CourtDocumentView, username: string): Promise<void> {
    return new CourtDataIngestionApiClient(await this.getSystemClientToken(username)).markAsNew(
      documentId,
      courtDocumentView,
    )
  }

  public async getDocuments(
    prisonerId: string,
    documentIdsFromCp: string[],
    username: string,
  ): Promise<CourtDocument[]> {
    return new CourtDataIngestionApiClient(await this.getSystemClientToken(username)).getDocuments(
      prisonerId,
      documentIdsFromCp,
    )
  }

  /**
   * Backfill administration deliberately uses the signed in user's token rather than the
   * system client token. CDIA checks the support role on that token, so authorisation is
   * enforced at the API and every run is attributable to a named person.
   */
  public async listBackfills(userToken: string): Promise<BackfillListResponse> {
    return new CourtDataIngestionApiClient(userToken).listBackfills()
  }

  public async getBackfill(backfillId: string, userToken: string): Promise<BackfillRunSummary> {
    return new CourtDataIngestionApiClient(userToken).getBackfill(backfillId)
  }

  public async startBackfill(backfillId: string, userToken: string): Promise<StartBackfillResult> {
    try {
      const response = await new CourtDataIngestionApiClient(userToken).startBackfill(backfillId)
      return { outcome: 'started', message: response.message, runId: response.runId }
    } catch (error) {
      const { status } = error as { status?: number }
      if (status === 409) {
        return { outcome: 'already-running', message: `A run of ${backfillId} is already in flight` }
      }
      if (status === 404) {
        return { outcome: 'unknown-backfill', message: `No backfill is registered with the id ${backfillId}` }
      }
      logger.error(error, `Failed to start backfill ${backfillId}`)
      throw error
    }
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
