import { Router } from 'express'
import FeedbackRoutes from './FeedbackRoutes'

export default function Index(): Router {
  const router = Router()

  router.get('/', new FeedbackRoutes().getFeedback)
  router.post('/', new FeedbackRoutes().postFeedback)

  return router
}
