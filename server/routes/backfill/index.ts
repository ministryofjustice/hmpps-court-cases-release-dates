import { Router } from 'express'
import BackfillRoutes from './BackfillRoutes'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import requireRole from '../../middleware/requireRole'
import asyncMiddleware from '../../middleware/asyncMiddleware'

export default function Index(courtDataIngestionService: CourtDataIngestionService): Router {
  const router = Router()

  router.use(requireRole('COURTCASE_RELEASEDATE_SUPPORT'))

  const routes = new BackfillRoutes(courtDataIngestionService)

  router.get('/', asyncMiddleware(routes.overview))
  router.get('/:backfillId', asyncMiddleware(routes.detail))
  router.post('/:backfillId/start', asyncMiddleware(routes.start))

  return router
}
