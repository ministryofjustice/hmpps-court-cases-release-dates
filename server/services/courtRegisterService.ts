import CourtRegisterApiClient from '../data/courtRegisterApiClient'
import { CourtDto } from '../@types/courtRegisterApi/types'
import { HmppsAuthClient } from '../data'

export default class CourtRegisterService {
  private courtNamesCache: Map<string, string> = new Map<string, string>()

  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  public async getCourtName(courtCode: string, username: string): Promise<string> {
    if (!this.courtNamesCache.has(courtCode)) {
      this.courtNamesCache.set(courtCode, (await this.findCourtById(courtCode, username)).courtName)
    }

    return this.courtNamesCache.get(courtCode)
  }

  private async findCourtById(courtCode: string, username: string): Promise<CourtDto> {
    return new CourtRegisterApiClient(await this.getSystemClientToken(username)).findCourtById(courtCode)
  }

  public async getCourtNames(courtCodes: string[], username: string): Promise<void> {
    const courtNames: CourtDto[] = await new CourtRegisterApiClient(
      await this.getSystemClientToken(username),
    ).findCourtsByIds(courtCodes)

    courtNames.forEach(court => {
      if (!this.courtNamesCache.has(court.courtId)) this.courtNamesCache.set(court.courtId, court.courtName)
    })
  }
}
