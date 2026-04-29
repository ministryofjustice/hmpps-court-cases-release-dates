import { Request, Response } from 'express'
import { Readable } from 'stream'
import PrisonerService from '../../../services/prisonerService'
import DocumentManagementService from '../../../services/documentManagementService'
import logger from '../../../../logger'
import RemandAndSentencingService from '../../../services/remandAndSentencingService'
import expectedTypes from '../../../@types/remandAndSentencingApi/documentTypes'
import { getAsStringOrDefault } from '../../../utils/utils'
import { DocumentSearchRequest } from '../../../@types/documentManagementApi/types'
import { getPagedDataResponse, getPaginationResults, govukPagination } from '../../../data/pagination'
import config from '../../../config'

export default class DocumentRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly documentManagementService: DocumentManagementService,
    private readonly remandAndSentencingService: RemandAndSentencingService,
  ) {}

  documents = async (req: Request, res: Response): Promise<void> => {
    const { prisoner } = req
    const { token, username } = req.user

    const sortByQuery = getAsStringOrDefault(req.query.sortBy, 'MOST_RECENT')
    const pageNumber = parseInt(getAsStringOrDefault(req.query.pageNumber, '1'), 10) - 1

    const documentSearchRequest = {
      ...defaultSearchParams,
      orderByDirection: sortByQuery === 'MOST_RECENT' ? 'DESC' : 'ASC',
      page: pageNumber,
      metadata: {
        prisonerId: prisoner.prisonerNumber,
      } as unknown as Record<string, never>,
    } as DocumentSearchRequest

    const serviceDefinitions = await this.prisonerService.getServiceDefinitions(prisoner.prisonerNumber, token)
    const documents = await this.documentManagementService.searchDocument(documentSearchRequest, username)
    const rasDocuments = await this.remandAndSentencingService.getDocuments(prisoner.prisonerNumber, username)

    const viewModelDocuments = documents.results.map(it => {
      const document = {
        documentUuid: it.documentUuid,
        createdTime: it.createdTime,
        filename: it.filename,
        fileExtension: it.fileExtension,
        fileSize: it.fileSize,
      } as Partial<DocumentViewModel>

      if (it.metadata.source === 'court-data-ingestion-api') {
        // From CP
        document.type = it.documentType
        document.typeDescription = [...expectedTypes.NON_SENTENCING, ...expectedTypes.SENTENCING].find(
          type => type.type === it.documentType,
        ).name
      } else {
        // From RaS
        rasDocuments.courtCaseDocuments.forEach(caseDocument =>
          Object.entries(caseDocument.appearanceDocumentsByType).forEach(appearanceAndType =>
            appearanceAndType[1].forEach(appearanceDocument => {
              if (appearanceDocument.documentUUID === it.documentUuid) {
                ;[document.type] = appearanceAndType
                document.typeDescription = expectedTypes[
                  appearanceDocument.warrantType as 'SENTENCING' | 'NON_SENTENCING'
                ].find(type => type.type === appearanceAndType[0]).name
                document.courtCaseUuid = caseDocument.courtCaseUuid
              }
            }),
          ),
        )
      }

      return document
    })

    const pagedDataResponse = getPagedDataResponse(documents)
    res.render('pages/prisoner/documents', {
      prisoner,
      serviceDefinitions,
      documents: viewModelDocuments,
      sortByQuery,
      pageNumber,
      pageSize: documentSearchRequest.pageSize,
      pagination: govukPagination(pagedDataResponse, new URL(req.originalUrl, config.domain)),
      paginationResults: getPaginationResults(pagedDataResponse),
      totalResults: documents.totalResultsCount,
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

type DocumentViewModel = {
  type: string
  typeDescription: string
  documentUuid: string
  filename: string
  fileExtension: string
  fileSize: number
  createdTime: string
  courtCaseUuid: string
}
