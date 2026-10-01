import { Router } from 'express'
import CourtDocumentRoutes from './CourtDocumentRoutes'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import RemandAndSentencingService from '../../services/remandAndSentencingService'
import PrisonService from '../../services/prisonService'
import asyncMiddleware from '../../middleware/asyncMiddleware'
import { canOpenCourtDocuments } from './access'

export default function Index(
  courtDataIngestionService: CourtDataIngestionService,
  remandAndSentencingService: RemandAndSentencingService,
  prisonService: PrisonService,
): Router {
  const router = Router()

  router.use(canOpenCourtDocuments)

  const routes = new CourtDocumentRoutes(courtDataIngestionService, remandAndSentencingService, prisonService)

  router.use(routes.previewing)
  router.get('/', asyncMiddleware(routes.prisons))
  router.get('/:prisonCode', asyncMiddleware(routes.week))
  router.get('/:prisonCode/day', asyncMiddleware(routes.day))

  return router
}
