import { Request, Response } from 'express'
import { Readable } from 'stream'
import { constants } from 'node:http2'
import { auditService } from '@ministryofjustice/hmpps-audit-client'
import PrisonerService from '../../../services/prisonerService'
import DocumentManagementService from '../../../services/documentManagementService'
import logger from '../../../../logger'
import RemandAndSentencingService from '../../../services/remandAndSentencingService'
import CourtRegisterService from '../../../services/courtRegisterService'
import { getAsArrayOrDefault, getAsStringOrDefault } from '../../../utils/utils'
import {
  Document,
  DOCUMENT_SEARCH_DEFAULT_TYPES,
  DocumentManagementMapper,
  DocumentSearchRequest,
  DocumentSearchResult,
  FacetRequest,
  FacetResult,
  FacetValue,
} from '../../../@types/documentManagementApi/types'
import { getPagedDataResponse, getPaginationResults, govukPagination } from '../../../data/pagination'
import { RasDocument, RaSDocumentMapper } from '../../../@types/remandAndSentencingApi/types'
import CourtDataIngestionService from '../../../services/courtDataIngestionService'
import commonPlatformDocumentTypes from '../../../@types/courtDataIngestionApi/commonPlatformDocumentTypes'
import commonPlatformDocumentStatuses from '../../../@types/courtDataIngestionApi/commonPlatformDocumentStatuses'
import expectedTypes from '../../../@types/remandAndSentencingApi/documentTypes'
import DocumentSearchOrderBy from '../../../@types/documentManagementApi/DocumentSearchOrderBy'
import { MetadataFilterMapper } from '../../../@types/documentManagementApi/MetadataFilter'
import { buildDocumentFilters, DocumentFilters } from '../../../data/documentFilter'
import { RasPrisonerDocuments } from '../../../@types/remandAndSentencingApi/remandAndSentencingTypes'

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

    const filters = buildDocumentFilters(req)

    const documentSearchRequest: DocumentSearchRequest = this.buildDocumentSearchRequest(
      prisoner.prisonerNumber,
      filters,
    )

    const serviceDefinitions = await this.prisonerService.getServiceDefinitions(prisoner.prisonerNumber, token)

    const documents = await this.documentManagementService.searchDocument(documentSearchRequest, username)
    const rasDocuments = await this.remandAndSentencingService.getDocuments(prisoner.prisonerNumber, username)
    const cpDocuments = await this.courtDataIngestionService.getDocuments(
      prisoner.prisonerNumber,
      DocumentManagementMapper.getCommonPlatformDocumentIds(documents.results),
      username,
    )

    await this.getCourtCodes(documents, rasDocuments, username)

    const viewModelDocuments = await Promise.all(
      documents.results
        .map(async it => {
          const document: Partial<DocumentViewModel> = {
            documentUuid: it.documentUuid,
            createdTime: it.createdTime,
            filename: it.filename,
            fileExtension: it.fileExtension,
            fileSize: it.fileSize,
            caseReference: DocumentManagementMapper.getCaseReferences(it),
            isNew: DocumentManagementMapper.getIsNew(it),
          }

          const rasDocument: RasDocument = RaSDocumentMapper.getRasDocument(
            rasDocuments.courtCaseDocuments,
            it.documentUuid,
          )

          if (it.metadata.source === 'court-data-ingestion-api') {
            document.source = it.metadata.source
            // From CP
            const cpDocument = cpDocuments.find(itCpDocument => itCpDocument.prisonDocumentId === it.documentUuid)
            // cpDocument can be missing if data is out of sync between CDIA and document management api.
            if (cpDocument) {
              document.typeDescription = commonPlatformDocumentTypes[cpDocument.documentType]?.name
              document.hearingType = cpDocument.courtHearing?.hearingType

              if (it.metadata?.courtCode) {
                document.courtCode = it.metadata.courtCode as string
                document.courtName = await this.courtRegisterService.getCourtName(document.courtCode, username)
              }

              document.hearingDate = cpDocument.courtHearing?.hearingDate
              document.courtCaseUuid = rasDocument?.caseDocument?.courtCaseUuid
            } else {
              document.typeDescription = [...expectedTypes.NON_SENTENCING, ...expectedTypes.SENTENCING].find(
                type => type.type === it.documentType,
              ).name
            }
            document.type = it.documentType
          } else if (rasDocument) {
            document.source = 'remand-and-sentencing-api'
            // From RaS
            document.type = rasDocument.documentType
            document.typeDescription = RaSDocumentMapper.getDocumentTypeDescription(
              rasDocument.appearanceDocument,
              document.type,
            )
            document.courtCaseUuid = rasDocument.caseDocument.courtCaseUuid
            document.hearingDate = RaSDocumentMapper.getHearingDate(rasDocument.appearanceDocument)
            document.warrantDate = RaSDocumentMapper.getWarrantDate(rasDocument.appearanceDocument)
            document.courtCode = rasDocument.appearanceDocument.courtCode
            document.courtName = await this.courtRegisterService.getCourtName(document.courtCode, username)
          }

          return document
        })
        .filter(it => !!it),
    )

    const pagedDataResponse = getPagedDataResponse(documents)
    filters.facets = this.parseFacetsForRendering(documents.facets)

    res.render('pages/prisoner/documents', {
      prisoner,
      serviceDefinitions,
      documents: viewModelDocuments,
      filters,
      pagination: govukPagination(pagedDataResponse, filters.baseUrl),
      paginationResults: getPaginationResults(pagedDataResponse),
      displayMaintenanceAlert: true,
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
            await this.sendAuditEvent(req)
            await this.courtDataIngestionService.documentViewed(documentId, { username }, username)
          } catch (error: unknown) {
            // Allow 404 errors for documents not in CDIA
            if ((error as { status?: number })?.status !== constants.HTTP_STATUS_NOT_FOUND) {
              throw error
            }
          }
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

  markAsNew = async (req: Request, res: Response): Promise<void> => {
    const { prisonerNumber, documentId } = req.params
    const { username } = req.user

    const showing = getAsStringOrDefault(req.body.showing, 'all')
    const byCaseReference = getAsArrayOrDefault(req.body.byCaseReference, 'all').join(',')
    const sortByQuery = getAsStringOrDefault(req.body.sortBy, 'MOST_RECENT')
    const pageNumber = getAsStringOrDefault(req.body.pageNumber, '1')
    const redirectUrl = `/prisoner/${prisonerNumber}/documents?sortBy=${sortByQuery}&pageNumber=${pageNumber}&showing=${showing}&byCaseReference=${byCaseReference}`

    try {
      await this.validateDocumentForDownload(documentId, prisonerNumber, username)
      await this.courtDataIngestionService.markAsNew(documentId, { username }, username)
      await this.sendAuditEvent(req, 'MARK_DOCUMENT_AS_NEW')
    } catch (err) {
      if (err.cause === constants.HTTP_STATUS_FORBIDDEN) {
        res.status(constants.HTTP_STATUS_FORBIDDEN).end()
        return
      }
      logger.error(`Error marking document ${documentId} as new: ${err.message}`)
      res.redirect(redirectUrl)
      return
    }

    res.redirect(redirectUrl)
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

  sendAuditEvent = async (req: Request, action = 'DOWNLOAD_DOCUMENT') => {
    try {
      const { prisonerNumber, documentId } = req.params
      const { username } = req.user

      const auditMessage = {
        action,
        who: username,
        subjectId: prisonerNumber,
        subjectType: 'PRISONER_ID',
        service: 'hmpps-court-cases-release-dates',
        correlationId: req.id,
        details: JSON.stringify({
          documentUuid: documentId,
        }),
        logErrors: true,
      }
      logger.debug(`Sending audit event [${auditMessage}]`)
      await auditService.sendAuditMessage(auditMessage)
      logger.debug(`Audit event sent successfully`)
    } catch (error) {
      logger.error(`Error sending audit event [${error}]`)
    }
  }

  buildDocumentSearchRequest = (prisonerNumber: string, filters: DocumentFilters): DocumentSearchRequest => {
    return {
      documentTypes: DOCUMENT_SEARCH_DEFAULT_TYPES,
      canonical: true,

      metadataFilters: [
        MetadataFilterMapper.getPrisonerNumber(prisonerNumber),
        MetadataFilterMapper.getStatus(commonPlatformDocumentStatuses.ACTIVE),
      ],

      facets: this.buildDocumentSearchFacetRequest(filters),

      page: filters.pagination.pageNumber - 1,
      pageSize: 20,
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

  private async getCourtCodes(documents: DocumentSearchResult, rasDocuments: RasPrisonerDocuments, username: string) {
    const courtCodes = [
      ...new Set([
        ...DocumentManagementMapper.getCourtCodes(documents.results),
        ...RaSDocumentMapper.collectCourtCodes(rasDocuments),
      ]),
    ]
    await this.courtRegisterService.getCourtNames(courtCodes, username)
  }
}

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
  hearingType: string
  source: 'remand-and-sentencing-api' | 'court-data-ingestion-api'
}
