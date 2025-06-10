import { Request, Response } from 'express'
import PrisonerService from '../../../services/prisonerService'
import AdjustmentsService from '../../../services/adjustmentsService'
import CalculateReleaseDatesService from '../../../services/calculateReleaseDatesService'
import { Prisoner } from '../../../@types/prisonerSearchApi/types'
import RemandAndSentencingService from '../../../services/remandAndSentencingService'
import PrisonService from '../../../services/prisonService'
import UnusedDeductionsService from '../../../services/unusedDeductionsService'
import { Adjustment } from '../../../@types/adjustmentsApi/types'

export default class OverviewRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly adjustmentsService: AdjustmentsService,
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
    private readonly remandAndSentencingService: RemandAndSentencingService,
    private readonly prisonService: PrisonService,
    private readonly unusedDeductionsService: UnusedDeductionsService,
  ) {}

  GET = async (req: Request, res: Response): Promise<void> => {
    const { prisoner } = req
    const { token, username, hasInactiveBookingAccess, hasReadOnlyNomisConfigAccess, hasRasAccess } = res.locals.user
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

    const [unusedDeductionMessage, adjustments] =
      await this.unusedDeductionsService.getCalculatedUnusedDeductionsMessageAndAdjustments(
        prisoner.prisonerNumber,
        bookingId,
        username,
        token,
        startOfSentenceEnvelope,
      )

    const unusedDeductions = this.getUnused(unusedDeductionMessage, adjustments)

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

    const anyThingsToDo = Object.values(serviceDefinitions.services).some(it => it.thingsToDo.count > 0)
    const latestRecall = hasRasAccess
      ? await this.remandAndSentencingService.getMostRecentRecall(prisoner.prisonerNumber, token)
      : null

    if (latestRecall) {
      latestRecall.location = await this.prisonService.getPrisonName(latestRecall.location, username)
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
      latestRecall,
      anyThingsToDo,
      unusedDeductions,
    })
  }

  private unusedDeductionsManuallyEnteredInDps(unusedDeductionMessage: string, adjustments: Adjustment[]) {
    const unusedDeductionAdjustment = adjustments
      .filter(it => it.source !== 'NOMIS')
      .find(it => it.adjustmentType === 'UNUSED_DEDUCTIONS')
    return ['UNSUPPORTED', 'RECALL'].includes(unusedDeductionMessage) && unusedDeductionAdjustment
  }

  public getUnused(unusedDeductionMessage: string, adjustments: Adjustment[]) {
    const unusedDays: { adjustmentType: string; unusedDays: number }[] = []

    if (
      unusedDeductionMessage === 'NONE' ||
      this.unusedDeductionsManuallyEnteredInDps(unusedDeductionMessage, adjustments)
    ) {
      ;[
        'REMAND',
        'TAGGED_BAIL',
        'RESTORATION_OF_ADDITIONAL_DAYS_AWARDED',
        'SPECIAL_REMISSION',
        'CUSTODY_ABROAD',
      ].forEach(deductionType => {
        const filteredAdjustments = adjustments.filter(it => it.adjustmentType === deductionType)
        const total = filteredAdjustments.map(a => a.days).reduce((sum, current) => sum + current, 0)
        const effective = filteredAdjustments.map(a => a.effectiveDays).reduce((sum, current) => sum + current, 0)
        const unused = total - effective

        unusedDays.push({ adjustmentType: deductionType, unusedDays: unused })
      })
    }

    return unusedDays
  }

  private async getAggregatedAdjustments(prisoner: Prisoner, startOfSentenceEnvelope: Date, username: string) {
    const adjustments = await this.adjustmentsService.getAdjustments(
      prisoner.prisonerNumber,
      startOfSentenceEnvelope,
      username,
    )

    const result: { [arithmeticKey: string]: { [typeKey: string]: { total: number; typeText: string } } } = {
      ADDITION: {},
      DEDUCTION: {},
      NONE: {},
    }

    adjustments
      .filter(adjustment => !['LAWFULLY_AT_LARGE', 'SPECIAL_REMISSION'].includes(adjustment.adjustmentType))
      .forEach(current => {
        const total = (result[current.adjustmentArithmeticType][current.adjustmentType]?.total ?? 0) + current.days
        if (total) {
          result[current.adjustmentArithmeticType][current.adjustmentType] = {
            total,
            typeText: current.adjustmentTypeText,
          }
        }
      })

    return result
  }
}
