import { RequestHandler, Router } from 'express'
import UnmatchedDocumentRoutes from './UnmatchedDocumentRoutes'
import DocumentManagementService from '../../services/documentManagementService'
import asyncMiddleware from '../../middleware/asyncMiddleware'

export default function Index(documentManagementService: DocumentManagementService): Router {
  const router = Router()
  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))

  get('/', new UnmatchedDocumentRoutes(documentManagementService).documents)
  get(
    ['/:documentId/download/:filename', '/:documentId/download'],
    new UnmatchedDocumentRoutes(documentManagementService).download,
  )

  return router
}
