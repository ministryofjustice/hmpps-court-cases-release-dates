import { Readable } from 'stream'
import config, { ApiConfig } from '../config'
import RestClient from './restClient'
import {
  OffenderSentenceAndOffences,
  PrisonApiUserCaseloads,
  PrisonApiPrison,
  PrisonApiPrisonDetails,
} from '../@types/prisonApi/types'

export default class PrisonApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Prison API', config.apis.prisonApi as ApiConfig, token)
  }

  async getPrisonerImage(prisonerNumber: string): Promise<Readable> {
    return this.restClient.stream({
      path: `/api/bookings/offenderNo/${prisonerNumber}/image/data`,
    })
  }

  async getUsersCaseloads(): Promise<PrisonApiUserCaseloads[]> {
    return this.restClient.get({ path: `/api/users/me/caseLoads` }) as Promise<PrisonApiUserCaseloads[]>
  }

  async getSentencesAndOffences(bookingId: number): Promise<OffenderSentenceAndOffences[]> {
    return (await this.restClient.get({
      path: `/api/offender-sentences/booking/${bookingId}/sentences-and-offences`,
    })) as Promise<unknown> as Promise<OffenderSentenceAndOffences[]>
  }

  async getActivePrisons(): Promise<PrisonApiPrison[]> {
    return this.restClient.get({ path: `/api/agencies/prisons` }) as Promise<PrisonApiPrison[]>
  }

  async getPrisonsWithServiceCode(serviceCode: string): Promise<PrisonApiPrisonDetails[]> {
    return this.restClient.get({ path: `/api/agency-switches/${serviceCode}` }) as Promise<PrisonApiPrisonDetails[]>
  }

  async postServiceCodeForPrison(serviceCode: string, prisonId: string): Promise<PrisonApiPrisonDetails> {
    return this.restClient.post({
      path: `/api/agency-switches/${serviceCode}/agency/${prisonId}`,
    }) as Promise<PrisonApiPrisonDetails>
  }

  async deleteServiceCodeForPrison(serviceCode: string, prisonId: string): Promise<PrisonApiPrisonDetails> {
    return this.restClient.delete({
      path: `/api/agency-switches/${serviceCode}/agency/${prisonId}`,
    }) as Promise<PrisonApiPrisonDetails>
  }
}
