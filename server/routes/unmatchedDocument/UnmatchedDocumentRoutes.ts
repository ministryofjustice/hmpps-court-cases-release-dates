import { Request, Response } from 'express'
import { Readable } from 'stream'
import { constants } from 'node:http2'
import { Document, DocumentManagementMapper, FileDownload } from '../../@types/documentManagementApi/types'
import DocumentManagementService from '../../services/documentManagementService'
import logger from '../../../logger'

export default class UnmatchedDocumentRoutes {
  constructor(private readonly documentManagementService: DocumentManagementService) {}

  download = async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params
    const { username } = req.user

    try {
      await this.validateDocumentForDownload(documentId, username)

      const downloadResult: FileDownload = await this.documentManagementService.downloadDocument(documentId, username)

      // Copy headers from API response
      DocumentManagementMapper.getDownloadHeaders(downloadResult).forEach((value: string, key: string): void => {
        res.set(key, value)
      })

      // Stream to client - prepare data and callbacks
      const fileStream: Readable = DocumentManagementMapper.getFileStreamForClient(downloadResult, documentId)
        .on('end', async (): Promise<void> => {
          logger.info(`Successfully streamed document ${documentId} to client.`)
          res.status(constants.HTTP_STATUS_OK).end()
        })
        .on('error', async (err: Error): Promise<void> => {
          const errorMessage: string = `Stream error during document download ${documentId}: ${err.message}`
          logger.error(errorMessage)
          res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).end()
        })
      // Stream to client - start download transmission
      fileStream.pipe(res)
    } catch (err) {
      const errorMessage = `Error downloading document ${documentId}: ${err.message}`
      logger.error(errorMessage)
      res
        .status(
          err.cause === constants.HTTP_STATUS_FORBIDDEN
            ? constants.HTTP_STATUS_FORBIDDEN
            : constants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        )
        .end()
    }
  }

  validateDocumentForDownload = async (documentId: string, username: string): Promise<void> => {
    const document: Document = await this.documentManagementService.getDocument(documentId, username)
    const documentPrisonerId: string = DocumentManagementMapper.getPrisonerId(document)

    if (documentPrisonerId) {
      throw new Error(`Requested document is not unmatched. It has been linked to a prisoner`, {
        cause: constants.HTTP_STATUS_FORBIDDEN,
      })
    }
  }
}
