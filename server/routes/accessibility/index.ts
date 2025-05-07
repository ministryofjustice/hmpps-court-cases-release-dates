import { Router } from 'express'
import AccessibilityRoutes from './AccessibilityRoutes'

export default function Index(): Router {
  const router = Router()

  router.get('/', new AccessibilityRoutes().getAccessibilityStatement)

  return router
}
