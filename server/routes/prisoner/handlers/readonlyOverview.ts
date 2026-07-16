import { Request, Response } from 'express'
import { ThingToDo } from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/@types'
import PrisonerService from '../../../services/prisonerService'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { Prisoner } from '../../../@types/prisonerSearchApi/types'
import RemandAndSentencingService from '../../../services/remandAndSentencingService'
import config from '../../../config'
import { CcrdServiceDefinitions } from '../../../@types/courtCasesReleaseDatesApi/types'
import { consecutiveToSentenceDetailsToOffenceDescriptions, getAsStringOrDefault } from '../../../utils/utils'
import CourtRegisterService from '../../../services/courtRegisterService'
import CourtCasesDetailsModel from '../../../model/CourtCaseDetailsModel'
import ManageOffencesService from '../../../services/manageOffencesService'
import { ImmigrationDetention } from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import ImmigrationDetentionService from '../../../services/ImmigrationDetentionService'

export default class ReadonlyOverviewRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
    private readonly remandAndSentencingService: RemandAndSentencingService,
    private readonly courtRegisterService: CourtRegisterService,
    private readonly manageOffencesService: ManageOffencesService,
    private readonly immigrationDetentionService: ImmigrationDetentionService,
  ) {}

  GET = async (req: Request, res: Response): Promise<void> => {
    const { prisoner } = req
    const { username, hasImmigrationDetentionAccess } = res.locals.user
    const bookingId = prisoner.bookingId as unknown as number

    const latestImmigrationRecordPromise: Promise<ImmigrationDetention | undefined> = hasImmigrationDetentionAccess
      ? this.remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner(
          prisoner.prisonerNumber,
          username,
        )
      : Promise.resolve(undefined)

    const [
      hasActiveSentences,
      nextCourtEvent,
      latestRecall,
      latestImmigrationRecord,
      [courtCaseDetailModels, offenceMap, offenceOutcomeMap],
    ] = await Promise.all([
      this.prisonerService.hasActiveSentencesAsSystem(bookingId, username),
      this.prisonerService.getNextCourtEventAsSystem(bookingId, username),
      this.remandAndSentencingService.getMostRecentRecallAsSystem(prisoner.prisonerNumber, username),
      latestImmigrationRecordPromise,
      this.getCourtCases(req, prisoner, username),
    ])
    const latestCalculationConfig = hasActiveSentences
      ? await this.calculateReleaseDatesService.getLatestCalculationForPrisonerAsSystem(
          prisoner.prisonerNumber,
          username,
        )
      : null

    const feedbackPrompt: ThingToDo = {
      title: 'Did you find what you need?',
      message: 'This is a new service. To make it the best it can be, your feedback is essential.',
      buttonText: 'Give feedback',
      buttonHref: config.externalUrls.feedbackSurvey.url,
    } as ThingToDo

    return res.render('pages/prisoner/readonlyOverview', {
      prisoner,
      latestCalculationConfig,
      displayMaintenanceAlert: true,
      feedbackPromptServiceDefinition: this.getFeedbackPromptServiceDefinition(feedbackPrompt),
      releaseDateDefinitionsUrl: config.externalUrls.releaseDateDefinitions.url,
      courtCaseDetailModels,
      offenceMap,
      offenceOutcomeMap,
      latestRecall,
      nextCourtEvent,
      hasImmigrationDetentionAccess,
      immigrationDetentionMessage:
        this.immigrationDetentionService.getImmigrationDetentionMessage(latestImmigrationRecord),
    })
  }

  private async getCourtCases(req: Request, prisoner: Prisoner, username: string) {
    const pageNumber = parseInt(getAsStringOrDefault(req.query.pageNumber, '1'), 10) - 1
    const courtCases = await this.remandAndSentencingService.searchCourtCases(
      prisoner.prisonerNumber,
      username,
      'STATUS_APPEARANCE_DATE_DESC',
      pageNumber,
      config.courtCasesPageSize,
    )
    const courtIds = courtCases.content
      .flatMap(courtCase => courtCase.latestCourtAppearance.courtCode)
      .filter(courtCode => courtCode !== undefined && courtCode !== null)
    const uniqueCourtCodes = Array.from(new Set(courtIds))

    const consecutiveToSentenceUuids = courtCases.content
      .flatMap(courtCase => courtCase.latestCourtAppearance.charges)
      .map(charge => charge.sentence?.consecutiveToSentenceUuid)
      .filter(sentenceUuid => sentenceUuid)
    const consecutiveToSentenceDetails = await this.remandAndSentencingService.getConsecutiveToDetails(
      consecutiveToSentenceUuids,
      req.user.username,
    )
    const charges = courtCases.content.flatMap(courtCase => courtCase.latestCourtAppearance.charges)
    const chargeCodes = charges
      .map(charge => charge.offenceCode)
      .concat(consecutiveToSentenceDetails.sentences.map(consecutiveToDetails => consecutiveToDetails.offenceCode))

    const chargeDescriptions: [string, string][] = Array.from(
      new Set(
        charges
          .filter(charge => charge.legacyData?.offenceDescription)
          .map(charge => [charge.offenceCode, charge.legacyData.offenceDescription])
          .concat(consecutiveToSentenceDetailsToOffenceDescriptions(consecutiveToSentenceDetails.sentences)) as [
          string,
          string,
        ][],
      ),
    )
    const [offenceMap, courtMap] = await Promise.all([
      this.manageOffencesService.getOffenceMap(Array.from(new Set(chargeCodes)), req.user.username, chargeDescriptions),
      this.courtRegisterService.getCourtMap(Array.from(new Set(uniqueCourtCodes)), req.user.username),
    ])

    const offenceOutcomeMap = Object.fromEntries(
      courtCases.content
        .flatMap(courtCase =>
          courtCase.latestCourtAppearance.charges.filter(charge => charge.outcome).map(charge => charge.outcome),
        )
        .map(outcome => [outcome.outcomeUuid, outcome.outcomeName]),
    )
    const courtCaseDetailModels = courtCases.content.map(
      pageCourtCaseContent => new CourtCasesDetailsModel(pageCourtCaseContent, courtMap),
    )
    return [courtCaseDetailModels, offenceMap, offenceOutcomeMap]
  }

  private getFeedbackPromptServiceDefinition(feedback: ThingToDo): CcrdServiceDefinitions {
    const feedbackPromptServiceDefinition = {
      services: {
        feedbackPrompt: {
          thingsToDo: {
            severity: 'REQUIRED_BEFORE_CALCULATION',
            things: [feedback],
            count: 1,
          },
          maintenanceAlert: {
            enabled: false,
            message: '',
          },
          href: '',
          text: '',
        },
      },
      maintenanceAlert: {
        enabled: false,
        message: '',
      },
    } as CcrdServiceDefinitions

    return feedbackPromptServiceDefinition
  }
}
