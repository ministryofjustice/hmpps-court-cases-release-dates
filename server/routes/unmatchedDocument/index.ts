import { RequestHandler, Router } from 'express'
import UnmatchedDocumentRoutes from './UnmatchedDocumentRoutes'
import DocumentManagementService from '../../services/documentManagementService'
import asyncMiddleware from '../../middleware/asyncMiddleware'
import CourtRegisterService from '../../services/courtRegisterService'
import requireRole from '../../middleware/requireRole'
import { Role, Roles } from '../../@types/roles'
import CourtDataIngestionService from '../../services/courtDataIngestionService'

export default function Index(
  documentManagementService: DocumentManagementService,
  courtDataIngestionService: CourtDataIngestionService,
  courtRegisterService: CourtRegisterService,
): Router {
  const router = Router()
  router.use(requireRole(Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)))

  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))

  get(
    '/',
    new UnmatchedDocumentRoutes(documentManagementService, courtDataIngestionService, courtRegisterService).documents,
  )
  get(
    ['/:documentId/download/:filename', '/:documentId/download'],
    new UnmatchedDocumentRoutes(documentManagementService, courtDataIngestionService, courtRegisterService).download,
  )

  return router
}
