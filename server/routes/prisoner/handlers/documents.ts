import { Request, Response } from 'express'
import { Readable } from 'stream'
import { constants } from 'node:http2'
import PrisonerService from '../../../services/prisonerService'
import DocumentManagementService from '../../../services/documentManagementService'
import logger from '../../../../logger'
import RemandAndSentencingService from '../../../services/remandAndSentencingService'
import CourtRegisterService from '../../../services/courtRegisterService'
import { getAsStringOrDefault } from '../../../utils/utils'
import { Document, DocumentManagementMapper, DocumentSearchRequest } from '../../../@types/documentManagementApi/types'
import { getPagedDataResponse, getPaginationResults, govukPagination } from '../../../data/pagination'
import config from '../../../config'
import { RaSDocumentMapper } from '../../../@types/remandAndSentencingApi/types'
import CourtDataIngestionService from '../../../services/courtDataIngestionService'
import { CourtDocument } from '../../../@types/courtDataIngestionApi/types'
import commonPlatformDocumentTypes from '../../../@types/courtDataIngestionApi/commonPlatformDocumentTypes'
import expectedTypes from '../../../@types/remandAndSentencingApi/documentTypes'

export default class DocumentRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly documentManagementService: DocumentManagementService,
    private readonly remandAndSentencingService: RemandAndSentencingService,
    private readonly courtDataIngestionService: CourtDataIngestionService,
    private readonly courtRegisterService: CourtRegisterService,
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
    const documentIdsFromCp = documents.results
      .filter(it => it.metadata.source === 'court-data-ingestion-api')
      .map(it => it.documentUuid)

    let cpDocuments: CourtDocument[] = []
    if (documentIdsFromCp.length) {
      cpDocuments = await this.courtDataIngestionService.getDocuments(
        prisoner.prisonerNumber,
        documentIdsFromCp,
        username,
      )
    }

    await this.courtRegisterService.getCourtNames(RaSDocumentMapper.collectCourtCodes(rasDocuments), username)

    let rasDocumentPromises: Promise<void>[] = []
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
        const cpDocument = cpDocuments.find(itCpDocument => itCpDocument.prisonDocumentId === it.documentUuid)
        // cpDocument can be missing if data is out of sync between CDIA and document management api.
        if (cpDocument) {
          document.typeDescription = commonPlatformDocumentTypes[cpDocument.documentType]?.name
        } else {
          document.typeDescription = [...expectedTypes.NON_SENTENCING, ...expectedTypes.SENTENCING].find(
            type => type.type === it.documentType,
          ).name
        }
        document.type = it.documentType
        document.isNew = cpDocument ? cpDocument.isUnread : false
      } else {
        // From RaS
        rasDocuments.courtCaseDocuments.forEach(caseDocument =>
          Object.entries(caseDocument.appearanceDocumentsByType).forEach(appearanceAndType => {
            rasDocumentPromises = [
              ...rasDocumentPromises,
              ...appearanceAndType[1].map(async appearanceDocument => {
                if (appearanceDocument.documentUUID === it.documentUuid) {
                  ;[document.type] = appearanceAndType
                  document.typeDescription = RaSDocumentMapper.getDocumentTypeDescription(
                    appearanceDocument,
                    document.type,
                  )
                  document.courtCaseUuid = caseDocument.courtCaseUuid
                  document.caseReference = RaSDocumentMapper.getCaseReference(appearanceDocument)
                  document.hearingDate = RaSDocumentMapper.getHearingDate(appearanceDocument)
                  document.warrantDate = RaSDocumentMapper.getWarrantDate(appearanceDocument)
                  document.courtCode = appearanceDocument.courtCode
                  document.courtName = await this.courtRegisterService.getCourtName(
                    appearanceDocument.courtCode,
                    username,
                  )
                }
              }),
            ]
          }),
        )
      }

      return document
    })

    await Promise.all(rasDocumentPromises) // Seems necessary to make all request before rendering, still now waiting for response

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
    const { username } = req.user

    try {
      await this.validateDocumentForDownload(documentId, prisonerNumber, username)

      const result = await this.documentManagementService.downloadDocument(documentId, username)

      // Copy headers from API response
      DocumentManagementMapper.getDownloadHeaders(result).forEach((value: string, key: string): void => {
        res.set(key, value)
      })

      const fileStream: Readable = DocumentManagementMapper.getFileStreamForClient(result, documentId)
        .on('end', async (): Promise<void> => {
          logger.info(`Successfully streamed document ${documentId} to client.`)
          try {
            await this.courtDataIngestionService.documentViewed(documentId, { username }, username)
          } catch (error: unknown) {
            // Allow 404 errors for documents not in CDIA
            if ((error as { status?: number })?.status !== constants.HTTP_STATUS_NOT_FOUND) {
              throw error
            }
          }
          // TODO audit & update notification endpoint document has been downloaded.
        })
        .on('error', async (err: Error): Promise<void> => {
          const errorMessage: string = `Stream error during document download ${documentId}: ${err.message}`
          logger.error(errorMessage)
          if (!res.headersSent) {
            res.redirect(`/prisoner/${prisonerNumber}/documents`)
          } else {
            res.end()
          }
        })
      // Stream to client
      fileStream.pipe(res)
    } catch (err) {
      const errorMessage = `Error downloading document ${documentId}: ${err.message}`
      logger.error(errorMessage)
      if (!res.headersSent) {
        if (err.cause === constants.HTTP_STATUS_FORBIDDEN) {
          res.status(constants.HTTP_STATUS_FORBIDDEN).end()
        } else {
          res.redirect(`/prisoner/${prisonerNumber}/documents`)
        }
      } else {
        res.end()
      }
    }
  }

  validateDocumentForDownload = async (documentId: string, prisonerNumber: string, username: string): Promise<void> => {
    const document: Document = await this.documentManagementService.getDocument(documentId, username)
    const documentPrisonerId: string = DocumentManagementMapper.getPrisonerId(document)

    if (prisonerNumber !== documentPrisonerId) {
      throw new Error(`Requested document is not linked to prisoner ${prisonerNumber}`, {
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
  canonical: true,
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
  courtCode: string
  courtName: string
  caseReference: string
  hearingDate: string
  warrantDate: string
  isNew: boolean
}
