import { compareDesc } from 'date-fns'
import config from '../config'
import RemandAndSentencingApiClient from '../data/remandAndSentencingApiClient'
import {
  ApiRecall,
  getRecallType,
  ImmigrationDetention,
  PagedCourtCase,
  RasPrisonerDocuments,
  Recall,
  SearchCourtCasesPage,
  SentenceConsecutiveToDetailsResponse,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { HmppsAuthClient } from '../data'
import logger from '../../logger'
import { PersonCourtContext } from '../model/hearingAction'

const COURT_CASE_PAGE_SIZE = 100

export default class RemandAndSentencingService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  public async getLatestImmigrationDetentionRecordForPrisoner(
    prisonerId: string,
    username: string,
  ): Promise<ImmigrationDetention | undefined> {
    const client = new RemandAndSentencingApiClient(await this.getSystemClientToken(username))
    try {
      return await client.findLatestImmigrationDetentionRecordByPerson(prisonerId)
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'status' in error) {
        const { status } = error as { status: number }
        if (status === 404) {
          logger.info('No Immigration Detention record found for prisonerId %s', prisonerId)
          return undefined
        }
      }
      throw error
    }
  }

  public thingsToDoConfig(): { enabled: boolean; repeatRemandHearingEnabled: boolean } {
    return config.thingsToDo
  }

  public async getCourtContext(prisonerId: string, username: string): Promise<PersonCourtContext> {
    const client = new RemandAndSentencingApiClient(await this.getSystemClientToken(username))

    const cases = await client
      .searchCourtCases(prisonerId, 'APPEARANCE_DATE_DESC', 0, COURT_CASE_PAGE_SIZE)
      .catch((error: unknown): SearchCourtCasesPage | undefined => {
        logger.error(error, `Could not read court cases for ${prisonerId}`)
        return undefined
      })

    const casesByReference = new Map<string, string>()
    const latestAppearanceDates = new Map<string, string>()
    cases?.content?.forEach((courtCase: PagedCourtCase) => {
      courtCase.caseReferences?.forEach((reference: string) => casesByReference.set(reference, courtCase.courtCaseUuid))
      if (courtCase.latestCourtAppearance?.warrantDate) {
        latestAppearanceDates.set(courtCase.courtCaseUuid, courtCase.latestCourtAppearance.warrantDate)
      }
    })

    return {
      casesByReference,
      latestAppearanceDates,
      casesChecked: cases !== undefined,
    }
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }

  async getMostRecentRecallAsSystem(nomsId: string, username: string): Promise<Recall> {
    return this.getMostRecentRecall(nomsId, await this.getSystemClientToken(username))
  }

  async getMostRecentRecall(nomsId: string, token: string): Promise<Recall> {
    const client = new RemandAndSentencingApiClient(token)
    const allApiRecalls = await client.getAllRecalls(nomsId)

    allApiRecalls.sort((a, b) => compareDesc(a.revocationDate, b.revocationDate))

    const mostRecent: ApiRecall = allApiRecalls.find(Boolean)

    // TODO not exactly sure why we've defined our own type for this rather than using the type as per the api, to revisit
    return mostRecent
      ? {
          recallId: mostRecent.recallUuid,
          recallDate: mostRecent.revocationDate ? new Date(mostRecent.revocationDate) : null,
          createdAt: mostRecent.createdAt,
          revocationDate: mostRecent.revocationDate,
          returnToCustodyDate: mostRecent.returnToCustodyDate ? new Date(mostRecent.returnToCustodyDate) : null,
          recallType: getRecallType(mostRecent.recallType),
          source: mostRecent.source,
          ual: mostRecent.ual?.days,
          location: mostRecent.createdByPrison,
          inPrisonOnRevocationDate: mostRecent.inPrisonOnRevocationDate,
        }
      : undefined
  }

  public async getDocuments(prisonerId: string, username: string): Promise<RasPrisonerDocuments> {
    return new RemandAndSentencingApiClient(await this.getSystemClientToken(username)).getDocuments(prisonerId)
  }

  public async getConsecutiveToDetails(
    sentenceUuids: string[],
    username: string,
  ): Promise<SentenceConsecutiveToDetailsResponse> {
    return sentenceUuids.filter(sentenceUuid => sentenceUuid).length
      ? new RemandAndSentencingApiClient(await this.getSystemClientToken(username)).consecutiveToDetails(sentenceUuids)
      : { sentences: [] }
  }

  public async searchCourtCases(
    prisonerId: string,
    username: string,
    sortBy: string,
    page: number,
    size?: number,
  ): Promise<SearchCourtCasesPage> {
    const client = new RemandAndSentencingApiClient(await this.getSystemClientToken(username))
    try {
      return await client.searchCourtCases(prisonerId, sortBy, page, size)
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'status' in error) {
        const { status } = error as { status: number }
        if (status === 404) {
          logger.info('No Court Cases found for prisonerId %s', prisonerId)
          return undefined
        }
      }
      throw error
    }
  }
}
