import { RequestHandler, Router } from 'express'
import { Services } from '../../services'
import asyncMiddleware from '../../middleware/asyncMiddleware'
import getPrisoner from '../../middleware/getPrisoner'
import AdjustmentsRoutes from './handlers/adjustments'
import CourtCasesRoutes from './handlers/courtCases'
import ImageRoutes from './handlers/image'
import OverviewRoutes from './handlers/overview'
import ReleaseDatesRoutes from './handlers/releaseDates'
import ConfigRoutes from '../config/ConfigRoutes'

export default function Index({
  prisonerService,
  prisonerSearchService,
  adjustmentsService,
  calculateReleaseDatesService,
  remandAndSentencingService,
  prisonService,
}: Services): Router {
  const router = Router()
  const get = (path: string | string[], handler: RequestHandler) =>
    router.get(path, getPrisoner(prisonerSearchService), asyncMiddleware(handler))

  router.get('/:prisonerNumber/image', new ImageRoutes(prisonerService).GET)

  get('/:prisonerNumber/adjustments', new AdjustmentsRoutes().GET)
  get('/:prisonerNumber/court-cases', new CourtCasesRoutes().GET)
  get(
    '/:prisonerNumber/overview',
    new OverviewRoutes(
      prisonerService,
      adjustmentsService,
      calculateReleaseDatesService,
      remandAndSentencingService,
      prisonService,
    ).GET,
  )
  get('/:prisonerNumber/release-dates', new ReleaseDatesRoutes().GET)

  router.get('/config', new ConfigRoutes(prisonerService).getConfig)
  router.post('/config', new ConfigRoutes(prisonerService).postConfig)

  return router
}
