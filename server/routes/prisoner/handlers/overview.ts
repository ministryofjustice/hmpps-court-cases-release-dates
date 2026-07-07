import { Request, Response } from 'express'
import PrisonerService from '../../../services/prisonerService'
import AdjustmentsService from '../../../services/adjustmentsService'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { Prisoner } from '../../../@types/prisonerSearchApi/types'
import RemandAndSentencingService from '../../../services/remandAndSentencingService'
import PrisonService from '../../../services/prisonService'
import { Recall } from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import config from '../../../config'
import ImmigrationDetentionService from '../../../services/ImmigrationDetentionService'

export default class OverviewRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly adjustmentsService: AdjustmentsService,
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
    private readonly remandAndSentencingService: RemandAndSentencingService,
    private readonly prisonService: PrisonService,
    private readonly immigrationDetentionService: ImmigrationDetentionService,
  ) {}

  GET = async (req: Request, res: Response): Promise<void> => {
    const { prisoner } = req
    const {
      token,
      username,
      hasInactiveBookingAccess,
      hasReadOnlyNomisConfigAccess,
      hasRasAccess,
      hasImmigrationDetentionAccess,
    } = res.locals.user
    const bookingId = prisoner.bookingId as unknown as number
    const isPrisonerOutside = prisoner.prisonId === 'OUT'
    const isPrisonerBeingTransferred = prisoner.prisonId === 'TRN'
    const showAdjustments = !(hasInactiveBookingAccess && (isPrisonerOutside || isPrisonerBeingTransferred))

    const startOfSentenceEnvelope = await this.prisonerService.getStartOfSentenceEnvelope(bookingId, token)
    const [nextCourtEvent, hasActiveSentences, serviceDefinitions] = await Promise.all([
      this.prisonerService.getNextCourtEvent(bookingId, token),
      this.prisonerService.hasActiveSentences(bookingId, token),
      this.prisonerService.getServiceDefinitions(prisoner.prisonerNumber, token),
    ])

    const aggregatedAdjustments = showAdjustments
      ? await this.getAggregatedAdjustments(prisoner, startOfSentenceEnvelope, username)
      : null

    const latestCalculationConfig = hasActiveSentences
      ? await this.calculateReleaseDatesService.getLatestCalculationForPrisoner(prisoner.prisonerNumber, token)
      : null

    const isIndeterminateAndHasNoCalculatedDates =
      hasActiveSentences && !latestCalculationConfig?.dates?.length
        ? await this.calculateReleaseDatesService.hasIndeterminateSentences(bookingId, token)
        : false

    const anyThingsToDo = Object.values(serviceDefinitions.services).some(
      it => it.thingsToDo.count > 0 && it.thingsToDo.severity !== 'NOTIFICATION',
    )
    const latestRecall: Recall & { locationName?: string } = hasRasAccess
      ? await this.remandAndSentencingService.getMostRecentRecall(prisoner.prisonerNumber, token)
      : null

    if (latestRecall && latestRecall.location) {
      latestRecall.locationName = await this.prisonService.getPrisonName(latestRecall.location, username)
    }

    const latestImmigrationRecord = hasImmigrationDetentionAccess
      ? await this.remandAndSentencingService.getLatestImmigrationDetentionRecordForPrisoner(
          prisoner.prisonerNumber,
          username,
        )
      : null
    const addImmigrationDetentionUrl = `${config.applications.immigrationDetention.url}/${prisoner.prisonerNumber}/immigration-detention/add`
    let overviewImmigrationDetentionUrl
    if (latestImmigrationRecord) {
      overviewImmigrationDetentionUrl = `${config.applications.immigrationDetention.url}/${prisoner.prisonerNumber}/immigration-detention/overview`
    }

    return res.render('pages/prisoner/overview', {
      prisoner,
      nextCourtEvent,
      aggregatedAdjustments,
      latestCalculationConfig,
      isIndeterminateAndHasNoCalculatedDates,
      hasActiveSentences,
      showAdjustments,
      hasReadOnlyNomisConfigAccess,
      serviceDefinitions,
      showRecalls: hasRasAccess,
      showRecallsLink: res.locals.user.hasRecallsAccess,
      latestRecall,
      anyThingsToDo,
      immigrationDetentionMessage:
        this.immigrationDetentionService.getImmigrationDetentionMessage(latestImmigrationRecord),
      addImmigrationDetentionUrl,
      overviewImmigrationDetentionUrl,
      immigrationDetentionUser: res.locals.user.hasImmigrationDetentionAccess,
      displayMaintenanceAlert: true,
    })
  }

  private async getAggregatedAdjustments(prisoner: Prisoner, startOfSentenceEnvelope: Date, username: string) {
    const adjustments = await this.adjustmentsService.getAdjustments(
      prisoner.prisonerNumber,
      startOfSentenceEnvelope,
      username,
    )

    const result: {
      [arithmeticKey: string]: { [typeKey: string]: { total: number; typeText: string; unused: number } }
    } = {
      ADDITION: {},
      DEDUCTION: {},
      NONE: {},
    }

    const filteredAdjustments = adjustments.filter(
      adjustment => !['LAWFULLY_AT_LARGE', 'SPECIAL_REMISSION'].includes(adjustment.adjustmentType),
    )

    filteredAdjustments.forEach(currentAdj => {
      const adjustmentsForType = filteredAdjustments.filter(it => it.adjustmentType === currentAdj.adjustmentType)
      const total = adjustmentsForType.map(a => a.days).reduce((sum, current) => sum + current, 0)
      const effective = adjustmentsForType.map(a => a.effectiveDays).reduce((sum, current) => sum + current, 0)
      const unused = total - effective

      if (total) {
        result[currentAdj.adjustmentArithmeticType][currentAdj.adjustmentType] = {
          total,
          typeText: currentAdj.adjustmentTypeText,
          ...(currentAdj.adjustmentArithmeticType === 'DEDUCTION' && { unused: unused > 0 ? unused : 0 }),
        }
      }
    })

    return result
  }
}
