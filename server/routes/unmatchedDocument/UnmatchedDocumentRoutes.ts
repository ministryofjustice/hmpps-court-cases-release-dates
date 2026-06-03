import { Request, Response } from 'express'
import { Readable } from 'stream'
import { constants } from 'node:http2'

import { getAsStringOrDefault } from '../../utils/utils'
import {
  Document,
  DocumentManagementMapper,
  DocumentSearchRequest,
  FileDownload,
} from '../../@types/documentManagementApi/types'
import { getPagedDataResponse, getPaginationResults, govukPagination } from '../../data/pagination'
import config from '../../config'
import DocumentManagementService from '../../services/documentManagementService'
import logger from '../../../logger'

export default class UnmatchedDocumentRoutes {
  constructor(private readonly documentManagementService: DocumentManagementService) {}

  documents = async (req: Request, res: Response): Promise<void> => {
    const { prisoner } = req
    const { username } = req.user

    const sortByQuery = getAsStringOrDefault(req.query.sortBy, 'MOST_RECENT')
    const pageNumber = parseInt(getAsStringOrDefault(req.query.pageNumber, '1'), 10) - 1

    const documentSearchRequest = {
      ...defaultSearchParams,
      orderByDirection: sortByQuery === 'MOST_RECENT' ? 'DESC' : 'ASC',
      page: pageNumber,
      metadata: {
        // prisonerId: '',
      } as unknown as Record<string, never>,
    } as DocumentSearchRequest

    const documents = await this.documentManagementService.searchDocument(documentSearchRequest, username)

    const viewModelDocuments = documents.results
      .filter((it: Document) => {
        return !it.metadata.prisonerId
      })
      .map(it => {
        return {
          documentUuid: it.documentUuid,
          source: DocumentManagementMapper.getSource(it),
          type: it.documentType,
          typeDescription: DocumentManagementMapper.getTypeDescription(it),
          createdTime: it.createdTime,
          filename: it.filename,
          fileExtension: it.fileExtension,
          fileSize: it.fileSize,
        } as UnmatchedDocumentViewModel
      })

    const pagedDataResponse = getPagedDataResponse(documents)

    res.render('pages/unmatchedDocuments/index', {
      prisoner,
      documents: viewModelDocuments,
      sortByQuery,
      pageNumber,
      pageSize: documentSearchRequest.pageSize,
      pagination: govukPagination(pagedDataResponse, new URL(req.originalUrl, config.domain)),
      paginationResults: getPaginationResults(pagedDataResponse),
      totalResults: documents.totalResultsCount,
    })
  }

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

const defaultSearchParams = {
  documentTypes: [
    'HMCTS_WARRANT',
    'TRIAL_RECORD_SHEET',
    'INDICTMENT',
    'PRISON_COURT_REGISTER',
    'BAIL_ORDER',
    'SUSPENDED_IMPRISONMENT_ORDER',
    'NOTICE_OF_DISCONTINUANCE',
    'COMMUNITY_ORDER',
  ],
  orderBy: 'CREATED_TIME',
  pageSize: 10,
} as DocumentSearchRequest

type UnmatchedDocumentViewModel = {
  documentUuid: string
  source: string
  type: string
  typeDescription: string
  createdTime: string
  filename: string
  fileExtension: string
  fileSize: number
}
