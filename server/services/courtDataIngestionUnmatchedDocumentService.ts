import { CourtDocument } from '../@types/courtDataIngestionApi/types'
import { HmppsAuthClient } from '../data'
import CourtDataIngestionApiClient from '../data/courtDataIngestionApiClient'

export default class CourtDataIngestionUnmatchedDocumentService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  public async getDocuments(documentIdsFromCp: string[], username: string): Promise<CourtDocument[]> {
    return documentIdsFromCp.length > 0
      ? new CourtDataIngestionApiClient(await this.getSystemClientToken(username)).getUnmatchedDocuments(
          documentIdsFromCp,
        )
      : []
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
