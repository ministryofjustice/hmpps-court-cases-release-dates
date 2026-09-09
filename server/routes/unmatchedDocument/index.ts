import { RequestHandler, Router } from 'express'
import UnmatchedDocumentRoutes from './UnmatchedDocumentRoutes'
import DocumentManagementService from '../../services/documentManagementService'
import asyncMiddleware from '../../middleware/asyncMiddleware'
import CourtRegisterService from '../../services/courtRegisterService'

export default function Index(
  documentManagementService: DocumentManagementService,
  courtRegisterService: CourtRegisterService,
): Router {
  const router = Router()
  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))

  get('/', new UnmatchedDocumentRoutes(documentManagementService, courtRegisterService).documents)
  get(
    ['/:documentId/download/:filename', '/:documentId/download'],
    new UnmatchedDocumentRoutes(documentManagementService, courtRegisterService).download,
  )

  return router
}
