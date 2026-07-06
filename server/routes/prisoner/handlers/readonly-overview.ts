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

export default class ReadonlyOverviewRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
    private readonly remandAndSentencingService: RemandAndSentencingService,
    private readonly courtRegisterService: CourtRegisterService,
    private readonly manageOffencesService: ManageOffencesService,
  ) {}

  GET = async (req: Request, res: Response): Promise<void> => {
    const { prisoner } = req
    const { token, username } = res.locals.user
    const bookingId = prisoner.bookingId as unknown as number

    const hasActiveSentences = await this.prisonerService.hasActiveSentences(bookingId, token)
    const latestCalculationConfig = hasActiveSentences
      ? await this.calculateReleaseDatesService.getLatestCalculationForPrisoner(prisoner.prisonerNumber, token)
      : null

    const feedbackPrompt: ThingToDo = {
      title: 'Did you find what you need?',
      message: 'This is a new service. To make it the best it can be, your feedback is essential.',
      buttonText: 'Give feedback',
      buttonHref: config.externalUrls.feedbackSurvey.url,
    } as ThingToDo

    const [courtCaseDetailModels, offenceMap, offenceOutcomeMap] = await this.getCourtCases(req, prisoner, username)

    return res.render('pages/prisoner/readonly-overview', {
      prisoner,
      latestCalculationConfig,
      displayMaintenanceAlert: true,
      feedbackPromptServiceDefinition: this.getFeedbackPromptServiceDefinition(feedbackPrompt),
      releaseDateDefinitionsUrl: config.externalUrls.releaseDateDefinitions.url,
      courtCaseDetailModels,
      offenceMap,
      offenceOutcomeMap,
    })
  }

  private async getCourtCases(req: Request, prisoner: Prisoner, username: string) {
    const pageNumber = parseInt(getAsStringOrDefault(req.query.pageNumber, '1'), 10) - 1
    const courtCases = await this.remandAndSentencingService.searchCourtCases(
      prisoner.prisonerNumber,
      username,
      'STATUS_APPEARANCE_DATE_DESC',
      pageNumber,
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
