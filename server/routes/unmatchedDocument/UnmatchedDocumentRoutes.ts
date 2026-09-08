import { Request, Response } from 'express'
import { Readable } from 'stream'
import { constants } from 'node:http2'

import {
  Document,
  DOCUMENT_SEARCH_DEFAULT_TYPES,
  DocumentManagementMapper,
  DocumentSearchRequest,
  FacetRequest,
  FacetResult,
  FacetValue,
  FileDownload,
} from '../../@types/documentManagementApi/types'
import { getPagedDataResponse, getPaginationResults, govukPagination } from '../../data/pagination'
import DocumentManagementService from '../../services/documentManagementService'
import logger from '../../../logger'
import { buildDocumentFilters, DocumentFilters } from '../../data/documentFilter'
import { MetadataFilterMapper } from '../../@types/documentManagementApi/MetadataFilter'
import commonPlatformDocumentStatuses from '../../@types/courtDataIngestionApi/commonPlatformDocumentStatuses'
import DocumentSearchOrderBy from '../../@types/documentManagementApi/DocumentSearchOrderBy'
import CourtRegisterService from '../../services/courtRegisterService'

export default class UnmatchedDocumentRoutes {
  constructor(
    private readonly documentManagementService: DocumentManagementService,
    private readonly courtRegisterService: CourtRegisterService,
  ) {}

  documents = async (req: Request, res: Response): Promise<void> => {
    const { username } = req.user

    const filters = buildDocumentFilters(req)
    const documentSearchRequest: DocumentSearchRequest = this.buildDocumentSearchRequest(filters)

    const documents = await this.documentManagementService.searchDocument(documentSearchRequest, username)

    await this.courtRegisterService.getCourtNames(DocumentManagementMapper.getCourtCodes(documents.results), username)

    const viewModelDocuments = await Promise.all(
      documents.results.map(async it => {
        return {
          documentUuid: it.documentUuid,
          createdTime: it.createdTime,
          filename: it.filename,
          fileExtension: it.fileExtension,
          fileSize: it.fileSize,
          caseReference: DocumentManagementMapper.getCaseReferences(it),
          isNew: DocumentManagementMapper.getIsNew(it),

          source: DocumentManagementMapper.getSource(it),
          type: it.documentType,
          typeDescription: DocumentManagementMapper.getTypeDescription(it),
          courtCode: DocumentManagementMapper.getCourtCode(it),
          courtName: await this.courtRegisterService.getCourtName(DocumentManagementMapper.getCourtCode(it), username),
        } as UnmatchedDocumentViewModel
      }),
    )

    const pagedDataResponse = getPagedDataResponse(documents)
    filters.facets = this.parseFacetsForRendering(documents.facets)

    res.render('pages/unmatchedDocuments/index', {
      documents: viewModelDocuments,
      filters,
      pagination: govukPagination(pagedDataResponse, filters.baseUrl),
      paginationResults: getPaginationResults(pagedDataResponse),
      displayMaintenanceAlert: true,
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

  buildDocumentSearchRequest = (filters: DocumentFilters): DocumentSearchRequest => {
    return {
      documentTypes: DOCUMENT_SEARCH_DEFAULT_TYPES,
      canonical: true,

      metadataFilters: [
        MetadataFilterMapper.getIsUnmatchedDocument(),
        MetadataFilterMapper.getStatus(commonPlatformDocumentStatuses.ACTIVE),
      ],

      facets: this.buildDocumentSearchFacetRequest(filters),

      page: filters.pagination.pageNumber - 1,
      pageSize: 100,
      orderBy: DocumentSearchOrderBy.CREATED_TIME,
      orderByDirection: filters.pagination.sortBy === 'MOST_RECENT' ? 'DESC' : 'ASC',
    } as DocumentSearchRequest
  }

  private buildDocumentSearchFacetRequest = (filters: DocumentFilters): FacetRequest[] => {
    const showingFacetRequest = {
      field: 'isUnread',
      type: 'VALUE',
      filter: MetadataFilterMapper.getShowing(filters.showing),
    } as FacetRequest

    const caseReferencesFacetRequest = {
      field: 'caseReferences',
      type: 'ARRAY',
      filter: MetadataFilterMapper.getByCaseReferences(filters.byCaseReferences),
    } as FacetRequest

    return [showingFacetRequest, caseReferencesFacetRequest]
  }

  private parseFacetsForRendering = (facets: { [p: string]: FacetResult }) => {
    const newFacets = facets
    const isUnreadFacet = facets.isUnread.values.filter(it => it.value === 'true')

    newFacets.isUnread.values =
      isUnreadFacet.length > 0
        ? isUnreadFacet
        : [
            {
              value: 'true',
              count: 0,
            } as FacetValue,
          ]
    return newFacets
  }
}

type UnmatchedDocumentViewModel = {
  documentUuid: string
  createdTime: string
  filename: string
  fileExtension: string
  fileSize: number
  caseReference: string
  isNew: boolean
  source: string
  type: string
  typeDescription: string
  courtCode: string
  courtName: string
}
