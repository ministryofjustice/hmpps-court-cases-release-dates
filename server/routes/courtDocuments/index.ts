import { Router } from 'express'
import CourtDocumentRoutes from './CourtDocumentRoutes'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import RemandAndSentencingService from '../../services/remandAndSentencingService'
import PrisonService from '../../services/prisonService'
import requireRole from '../../middleware/requireRole'
import asyncMiddleware from '../../middleware/asyncMiddleware'
import { Role, Roles } from '../../@types/roles'

export default function Index(
  courtDataIngestionService: CourtDataIngestionService,
  remandAndSentencingService: RemandAndSentencingService,
  prisonService: PrisonService,
): Router {
  const router = Router()

  router.use(requireRole(Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)))

  const routes = new CourtDocumentRoutes(courtDataIngestionService, remandAndSentencingService, prisonService)

  router.get('/', asyncMiddleware(routes.prisons))
  router.get('/:prisonCode', asyncMiddleware(routes.week))
  router.get('/:prisonCode/day', asyncMiddleware(routes.day))

  return router
}
