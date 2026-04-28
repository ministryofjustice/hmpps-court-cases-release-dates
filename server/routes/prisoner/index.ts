import { RequestHandler, Router } from 'express'
import { Services } from '../../services'
import asyncMiddleware from '../../middleware/asyncMiddleware'
import AdjustmentsRoutes from './handlers/adjustments'
import CourtCasesRoutes from './handlers/courtCases'
import ImageRoutes from './handlers/image'
import OverviewRoutes from './handlers/overview'
import ReleaseDatesRoutes from './handlers/releaseDates'
import ConfigRoutes from '../config/ConfigRoutes'
import DocumentRoutes from './handlers/documents'

export default function Index({
  prisonerService,
  adjustmentsService,
  calculateReleaseDatesService,
  remandAndSentencingService,
  prisonService,
  documentManagementService,
}: Services): Router {
  const router = Router()
  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))

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

  get(
    '/:prisonerNumber/documents',
    new DocumentRoutes(prisonerService, documentManagementService, remandAndSentencingService).documents,
  )
  get(
    '/:prisonerNumber/documents/:documentId/download',
    new DocumentRoutes(prisonerService, documentManagementService, remandAndSentencingService).downloadDocument,
  )

  router.get('/config', new ConfigRoutes(prisonerService).getConfig)
  router.post('/config', new ConfigRoutes(prisonerService).postConfig)

  return router
}
