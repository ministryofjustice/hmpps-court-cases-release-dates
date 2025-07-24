import { RequestHandler } from 'express'
import PrisonerService from '../../services/prisonerService'
import ConfigurationViewModel from '../../model/ConfigurationViewModel'
import readOnlyNomisScreens from '../../model/ReadOnlyNomisScreens'
import ReadOnlyPrisonResult from '../../model/ReadOnlyPrisonResult'
import { PrisonApiPrisonDetails } from '../../@types/prisonApi/types'

export default class ConfigRoutes {
  constructor(private readonly prisonerService: PrisonerService) {
    // intentionally left blank
  }

  public getConfig: RequestHandler = async (req, res) => {
    const { token, hasReadOnlyNomisConfigAccess } = res.locals.user
    const activePrisons = await this.prisonerService.getActivePrisons(token)
    const updateId = req.query.id as string
    const readOnly = (req.query.readonly as string)?.split(',')
    const notReadOnly = (req.query.notreadonly as string)?.split(',')

    let readOnlyChanges: string[] = []
    let notReadOnlyChanges: string[] = []
    let updatedScreen

    if (readOnly) {
      readOnlyChanges = readOnly.map(it => activePrisons.find(i => i.agencyId === it)?.description)
    }
    if (notReadOnly) {
      notReadOnlyChanges = notReadOnly.map(it => activePrisons.find(i => i.agencyId === it)?.description)
    }
    if (updateId) {
      updatedScreen = readOnlyNomisScreens.find(it => it.id === updateId)?.display
    }

    const readOnlyPrisonResults = await Promise.all(
      readOnlyNomisScreens.map(async it => {
        return new ReadOnlyPrisonResult(
          it.id,
          (await this.prisonerService.getPrisonsWithServiceCode(it.apiId)).map(i => i.agencyId),
        )
      }),
    )
    if (hasReadOnlyNomisConfigAccess) {
      return res.render('pages/config/index', {
        model: new ConfigurationViewModel(
          activePrisons,
          readOnlyPrisonResults,
          readOnlyChanges,
          notReadOnlyChanges,
          updatedScreen,
        ),
      })
    }
    return res.redirect('/')
  }

  public postConfig: RequestHandler = async (req, res) => {
    const currentEnabledPrisons = await this.prisonerService.getPrisonsWithServiceCode(req.body.apiId)
    const checkedBoxes = [req.body.checkedBoxes === undefined ? [] : req.body.checkedBoxes].flat()
    const redirectSection = readOnlyNomisScreens.find(it => it.apiId === req.body.apiId).id

    const newReadOnly = this.enableCheckedBoxes(checkedBoxes, currentEnabledPrisons, req.body.apiId)
    const newUnchecked = this.disableUncheckedBoxes(checkedBoxes, currentEnabledPrisons, req.body.apiId)

    res.redirect(
      `/config?id=${redirectSection}&readonly=${newReadOnly.join(',')}&notreadonly=${newUnchecked.join(',')}`,
    )
  }

  private enableCheckedBoxes(checkedBoxes: string[], currentEnabledPrisons: PrisonApiPrisonDetails[], apiId: string) {
    const newBoxes = checkedBoxes.filter(it => !currentEnabledPrisons.map(i => i.agencyId).includes(it))
    newBoxes.forEach(it => this.prisonerService.postServiceCodeForPrison(apiId, it))
    return newBoxes
  }

  private disableUncheckedBoxes(
    checkedBoxes: string[],
    currentEnabledPrisons: PrisonApiPrisonDetails[],
    apiId: string,
  ) {
    const newboxes = currentEnabledPrisons.filter(it => !checkedBoxes.includes(it.agencyId))
    newboxes.forEach(it => this.prisonerService.deleteServiceCodeForPrison(apiId, it.agencyId))
    return newboxes.map(it => it.agencyId)
  }
}
