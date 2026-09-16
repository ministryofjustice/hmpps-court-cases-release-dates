import { Router } from 'express'
import DeliveryAddressRoutes from './DeliveryAddressRoutes'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import requireRole from '../../middleware/requireRole'
import asyncMiddleware from '../../middleware/asyncMiddleware'
import { Role, Roles } from '../../@types/roles'

export default function Index(courtDataIngestionService: CourtDataIngestionService): Router {
  const router = Router()

  router.use(requireRole(Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)))

  const routes = new DeliveryAddressRoutes(courtDataIngestionService)

  router.get('/', asyncMiddleware(routes.overview))
  router.get('/categories', asyncMiddleware(routes.categories))
  router.get('/categories/new', asyncMiddleware(routes.newCategoryForm))
  router.post('/categories', asyncMiddleware(routes.createCategory))
  router.get('/classify', asyncMiddleware(routes.classifyForm))
  router.post('/classify', asyncMiddleware(routes.classify))
  router.get('/confirm', asyncMiddleware(routes.confirmForm))
  router.post('/confirm', asyncMiddleware(routes.confirm))

  return router
}
