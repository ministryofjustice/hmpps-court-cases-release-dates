import { Request, Response } from 'express'
import { Readable } from 'stream'
import PrisonerService from '../../../services/prisonerService'
import DocumentManagementService from '../../../services/documentManagementService'
import logger from '../../../../logger'

export default class DocumentRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly documentManagementService: DocumentManagementService,
  ) {}

  documents = async (req: Request, res: Response): Promise<void> => {
    const { prisoner } = req
    const { token, username } = req.user

    const serviceDefinitions = await this.prisonerService.getServiceDefinitions(prisoner.prisonerNumber, token)
    const documents = await this.documentManagementService.searchDocument(prisoner.prisonerNumber, username)

    res.render('pages/prisoner/documents', {
      prisoner,
      serviceDefinitions,
      documents: documents.results.map(it => {
        return {
          type: 'Remand warrant',
          documentUuid: it.documentUuid,
          createdTime: it.createdTime,
          filename: it.filename,
          fileExtension: it.fileExtension,
          fileSize: it.fileSize,
        } as Document
      }),
    })
  }

  downloadDocument = async (req: Request, res: Response): Promise<void> => {
    const { prisonerNumber, documentId } = req.params
    const { username } = res.locals.user

    try {
      const result = await this.documentManagementService.downloadDocument(documentId, username)

      let fileStream: Readable
      if (result.body instanceof Readable) {
        fileStream = result.body
      } else if (Buffer.isBuffer(result.body)) {
        fileStream = new Readable()
        fileStream.push(result.body)
        fileStream.push(null)
      } else {
        throw new Error(`Unexpected body type for documentId=${documentId}`)
      }

      // Copy headers from API response
      if (result.header['content-disposition']) {
        res.set('content-disposition', result.header['content-disposition'])
      }
      if (result.header['content-length']) {
        res.set('content-length', result.header['content-length'])
      }
      if (result.header['content-type']) {
        res.set('content-type', result.header['content-type'])
      }

      // Stream to client
      fileStream.pipe(res)

      fileStream.on('end', async () => {
        logger.info(`Successfully streamed document ${documentId} to client.`)
        // TODO audit & update notification endpoint document has been downloaded.
      })

      fileStream.on('error', err => {
        logger.error(`Stream error during document download ${documentId}: ${err.message}`)
        if (!res.headersSent) {
          res.redirect(`/prisoner/${prisonerNumber}/documents`)
        } else {
          res.end()
        }
      })
    } catch (err) {
      logger.error(`Error downloading document ${documentId}: ${err.message}`)
      if (!res.headersSent) {
        res.redirect(`/prisoner/${prisonerNumber}/documents`)
      } else {
        res.end()
      }
    }
  }
}

type Document = {
  type: 'Remand warrant'
  documentUuid: string
  filename: string
  fileExtension: string
  fileSize: number
  createdTime: string
}
