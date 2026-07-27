import { RequestHandler, Router } from 'express'
import {
  PersonSentenceCalculationPermission,
  prisonerPermissionsGuard,
} from '@ministryofjustice/hmpps-prison-permissions-lib'
import { Services } from '../../services'
import asyncMiddleware from '../../middleware/asyncMiddleware'
import AdjustmentsRoutes from './handlers/adjustments'
import CourtCasesRoutes from './handlers/courtCases'
import ImageRoutes from './handlers/image'
import OverviewRoutes from './handlers/overview'
import ReadonlyOverviewRoutes from './handlers/readonlyOverview'
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
  courtDataIngestionService,
  courtRegisterService,
  manageOffencesService,
  immigrationDetentionService,
  prisonPermissionsService,
}: Services): Router {
  const router = Router()
  const get = (path: string | string[], ...handlers: RequestHandler[]) =>
    router.get(path, ...handlers.map(handler => asyncMiddleware(handler)))
  const post = (path: string | string[], ...handlers: RequestHandler[]) =>
    router.post(path, ...handlers.map(handler => asyncMiddleware(handler)))

  const requireRead = prisonerPermissionsGuard(prisonPermissionsService, {
    requestDependentOn: [PersonSentenceCalculationPermission.read],
  })
  const requireEdit = prisonerPermissionsGuard(prisonPermissionsService, {
    requestDependentOn: [PersonSentenceCalculationPermission.edit],
  })

  get('/:prisonerNumber/image', requireEdit, new ImageRoutes(prisonerService).GET)
  get('/:prisonerNumber/adjustments', requireEdit, new AdjustmentsRoutes().GET)
  get('/:prisonerNumber/court-cases', requireEdit, new CourtCasesRoutes().GET)
  get(
    '/:prisonerNumber/overview',
    requireEdit,
    new OverviewRoutes(
      prisonerService,
      adjustmentsService,
      calculateReleaseDatesService,
      remandAndSentencingService,
      prisonService,
      immigrationDetentionService,
    ).GET,
  )
  get(
    '/:prisonerNumber/readonly-overview',
    requireRead,
    new ReadonlyOverviewRoutes(
      prisonerService,
      calculateReleaseDatesService,
      remandAndSentencingService,
      courtRegisterService,
      manageOffencesService,
      immigrationDetentionService,
    ).GET,
  )
  get('/:prisonerNumber/release-dates', requireEdit, new ReleaseDatesRoutes().GET)

  get(
    '/:prisonerNumber/documents',
    requireEdit,
    new DocumentRoutes(
      prisonerService,
      documentManagementService,
      remandAndSentencingService,
      courtDataIngestionService,
      courtRegisterService,
    ).documents,
  )
  get(
    ['/:prisonerNumber/documents/:documentId/download/:filename', '/:prisonerNumber/documents/:documentId/download'],
    requireEdit,
    new DocumentRoutes(
      prisonerService,
      documentManagementService,
      remandAndSentencingService,
      courtDataIngestionService,
      courtRegisterService,
    ).downloadDocument,
  )

  post(
    '/:prisonerNumber/documents/:documentId/mark-as-new',
    requireEdit,
    new DocumentRoutes(
      prisonerService,
      documentManagementService,
      remandAndSentencingService,
      courtDataIngestionService,
      courtRegisterService,
    ).markAsNew,
  )

  router.get('/config', new ConfigRoutes(prisonerService).getConfig)
  router.post('/config', new ConfigRoutes(prisonerService).postConfig)

  return router
}
