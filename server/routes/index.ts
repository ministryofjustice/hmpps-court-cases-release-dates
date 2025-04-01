import { type RequestHandler, Router } from 'express'
import asyncMiddleware from '../middleware/asyncMiddleware'
import type { Services } from '../services'
import prisonerRoutes from './prisoner'
import configRoutes from './config'
import feedbackRoutes from './feedback'
import config from '../config'

export default function routes(services: Services): Router {
  const router = Router()
  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))

  get('/', async (_, res) => res.redirect(config.applications.digitalPrisonServices.url))

  router.use('/prisoner', prisonerRoutes(services))
  router.use('/config', configRoutes(services))
  router.use('/feedback', feedbackRoutes())

  return router
}
