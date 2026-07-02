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
    const missingCourtCodes = courtCodes.filter(courtCode => !this.courtNamesCache.has(courtCode))

    if (!missingCourtCodes.length) return

    const courtNames: CourtDto[] = await new CourtRegisterApiClient(
      await this.getSystemClientToken(username),
    ).findCourtsByIds(missingCourtCodes)

    courtNames.forEach(court => {
      if (!this.courtNamesCache.has(court.courtId)) this.courtNamesCache.set(court.courtId, court.courtName)
    })
  }

  async getCourtMap(courtIds: string[], username: string): Promise<{ [key: string]: string }> {
    let courtMap = {}
    const toSearchIds = courtIds.filter(courtId => courtId)
    if (toSearchIds.length) {
      const courts = await new CourtRegisterApiClient(await this.getSystemClientToken(username)).findCourtsByIds(
        Array.from(new Set(toSearchIds)),
      )
      courtMap = Object.fromEntries(courts.map(court => [court.courtId, court.courtName]))
    }
    return courtMap
  }
}
