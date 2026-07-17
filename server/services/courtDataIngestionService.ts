import { CourtDocument, CourtDocumentView } from '../@types/courtDataIngestionApi/types'
import { HmppsAuthClient } from '../data'
import CourtDataIngestionApiClient from '../data/courtDataIngestionApiClient'

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

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
