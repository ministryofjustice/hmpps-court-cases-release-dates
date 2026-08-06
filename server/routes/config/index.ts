import { Router } from 'express'
import { Services } from '../../services'
import ConfigRoutes from './ConfigRoutes'
import requireRole from '../../middleware/requireRole'
import asyncMiddleware from '../../middleware/asyncMiddleware'
import { Role, Roles } from '../../@types/roles'

export default function Index({ prisonerService }: Services): Router {
  const router = Router()

  router.use(requireRole(Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)))
  const routes = new ConfigRoutes(prisonerService)
  router.get('/', asyncMiddleware(routes.getConfig))
  router.post('/', asyncMiddleware(routes.postConfig))

  return router
}
