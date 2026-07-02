import logger from '../../logger'
import ManageOffencesApiClient from '../data/manageOffencesApiClient'
import type { Offence } from '../@types/manageOffencesApi/manageOffencesClientTypes'

export default class ManageOffencesService {
  constructor(private readonly manageOffencesApiClient: ManageOffencesApiClient) {}

  async getOffenceByCode(offenceCode: string, username: string, legacyDescription: string): Promise<Offence> {
    try {
      return await this.manageOffencesApiClient.getOffenceByCode(offenceCode, username)
    } catch (e) {
      logger.error(e)
      return Promise.resolve({
        changedDate: '',
        code: offenceCode,
        id: -1,
        isChild: false,
        revisionId: -1,
        startDate: '',
        description: legacyDescription,
      })
    }
  }

  async searchOffence(searchString: string, username: string): Promise<Offence[]> {
    return this.manageOffencesApiClient.searchOffence(searchString, username)
  }

  async getOffencesByCodes(offenceCodes: string[], username: string): Promise<Offence[]> {
    return this.manageOffencesApiClient.getOffencesByCodes(offenceCodes, username)
  }

  async getOffenceMap(offenceCodes: string[], username: string, offenceDescriptions: [string, string][]) {
    let offenceMap = Object.fromEntries(offenceDescriptions)
    const toSearchCodes = offenceCodes.filter(offenceCode => offenceCode)
    if (toSearchCodes.length) {
      const offences = await this.getOffencesByCodes(Array.from(new Set(toSearchCodes)), username)
      offenceMap = {
        ...offenceMap,
        ...Object.fromEntries(offences.map(offence => [offence.code, offence.description])),
      }
    }
    return offenceMap
  }
}
