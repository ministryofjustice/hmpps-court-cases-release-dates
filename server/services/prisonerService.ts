import { Readable } from 'stream'
import PrisonApiClient from '../data/prisonApiClient'
import { HmppsAuthClient } from '../data'
import {
  CourtEventDetails,
  OffenderSentenceAndOffences,
  PrisonApiPrison,
  PrisonApiPrisonDetails,
  PrisonApiUserCaseloads,
} from '../@types/prisonApi/types'
import CourtCasesReleaseDatesApiClient from '../data/courtCasesReleaseDatesApiClient'
import { CcrdServiceDefinitions } from '../@types/courtCasesReleaseDatesApi/types'

export default class PrisonerService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonerImage(username: string, prisonerNumber: string): Promise<Readable> {
    return new PrisonApiClient(await this.getSystemClientToken(username)).getPrisonerImage(prisonerNumber)
  }

  async getNextCourtEventAsSystem(bookingId: number, username: string): Promise<CourtEventDetails> {
    return this.getNextCourtEvent(bookingId, await this.getSystemClientToken(username))
  }

  async getNextCourtEvent(bookingId: number, token: string): Promise<CourtEventDetails> {
    return new PrisonApiClient(token).getNextCourtEvent(bookingId)
  }

  async getActiveCourtCaseCount(bookingId: number, token: string): Promise<number> {
    return new PrisonApiClient(token).getActiveCourtCaseCount(bookingId)
  }

  async getUsersCaseloads(token: string): Promise<PrisonApiUserCaseloads[]> {
    return new PrisonApiClient(token).getUsersCaseloads()
  }

  async getStartOfSentenceEnvelope(bookingId: number, token: string): Promise<Date> {
    const sentencesAndOffences = await new PrisonApiClient(token).getSentencesAndOffences(bookingId)
    return this.findStartOfSentenceEnvelope(sentencesAndOffences)
  }

  private findStartOfSentenceEnvelope(sentences: OffenderSentenceAndOffences[]): Date {
    const activeSentences = sentences.filter(it => it.sentenceStatus === 'A')
    if (activeSentences.length) {
      return new Date(
        Math.min.apply(
          null,
          activeSentences.map(it => new Date(it.sentenceDate)),
        ),
      )
    }
    return null
  }

  async hasActiveSentencesAsSystem(bookingId: number, username: string): Promise<boolean> {
    return this.hasActiveSentences(bookingId, await this.getSystemClientToken(username))
  }

  async hasActiveSentences(bookingId: number, token: string): Promise<boolean> {
    const sentencesAndOffences = await new PrisonApiClient(token).getSentencesAndOffences(bookingId)
    return sentencesAndOffences.some(it => it.sentenceStatus === 'A')
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  async getActivePrisons(token: string): Promise<PrisonApiPrison[]> {
    return new PrisonApiClient(token).getActivePrisons()
  }

  async getPrisonsWithServiceCode(serviceCode: string): Promise<PrisonApiPrisonDetails[]> {
    const token = await this.hmppsAuthClient.getSystemClientToken()
    return new PrisonApiClient(token).getPrisonsWithServiceCode(serviceCode)
  }

  async postServiceCodeForPrison(serviceCode: string, prisonId: string): Promise<PrisonApiPrisonDetails> {
    const token = await this.hmppsAuthClient.getSystemClientToken()
    return new PrisonApiClient(token).postServiceCodeForPrison(serviceCode, prisonId)
  }

  async deleteServiceCodeForPrison(serviceCode: string, prisonId: string): Promise<PrisonApiPrisonDetails> {
    const token = await this.hmppsAuthClient.getSystemClientToken()
    return new PrisonApiClient(token).deleteServiceCodeForPrison(serviceCode, prisonId)
  }

  async getServiceDefinitions(prisonerId: string, token: string): Promise<CcrdServiceDefinitions> {
    return new CourtCasesReleaseDatesApiClient(token).getServiceDefinitions(prisonerId)
  }
}
