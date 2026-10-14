import { Request } from 'express'
import { getSortLink } from './pagination'
import { getAsArrayOrDefault, getAsStringOrDefault } from '../utils/utils'
import config from '../config'
import {
  DocumentFilters,
  getCaseReferencesRemoveFilterLinks,
  getRemoveFilterLinks,
  getShowingRemoveFilterLink,
} from './documentFilter'

export type UnmatchedDocumentFilters = {
  byAddressedPrisons: string[]
  removeFilterLink: {
    showing: string
    caseReferences: { [p: string]: string }
    addressedPrisons: { [p: string]: string }
  }
} & DocumentFilters

export function buildDocumentFilters(req: Request): UnmatchedDocumentFilters {
  const baseUrl = new URL(req.originalUrl, config.domain)
  const byCaseReferences = getAsArrayOrDefault(req.query.byCaseReference, 'all')
  const byAddressedPrisons = getAsArrayOrDefault(req.query.byAddressedPrison, 'all')

  return {
    baseUrl,
    baseUrlLink: getBaseUrlLink(baseUrl),
    showing: getAsStringOrDefault(req.query.showing, 'all'),
    byCaseReferences,
    byAddressedPrisons,
    pagination: {
      sortBy: getAsStringOrDefault(req.query.sortBy, 'MOST_RECENT'),
      pageNumber: parseInt(getAsStringOrDefault(req.query.pageNumber, '1'), 10),
    },
    sortLink: {
      mostRecent: getSortLink(baseUrl, 'MOST_RECENT'),
      earliest: getSortLink(baseUrl, 'EARLIEST'),
    },
    removeFilterLink: {
      showing: getShowingRemoveFilterLink(baseUrl),
      caseReferences: getCaseReferencesRemoveFilterLinks(baseUrl, byCaseReferences),
      addressedPrisons: getAddressedPrisonRemoveFilterLinks(baseUrl, byAddressedPrisons),
    },
  }
}

// Builds a link to the base page, clean of any filters or sorting options
function getBaseUrlLink(url: URL): string {
  const linkUrl = new URL(url)
  linkUrl.searchParams.delete('pageNumber')
  linkUrl.searchParams.delete('sortBy')
  linkUrl.searchParams.delete('showing')
  linkUrl.searchParams.delete('byCaseReference')
  linkUrl.searchParams.delete('byAddressedPrison')
  return linkUrl.pathname
}

function getAddressedPrisonRemoveFilterLinks(url: URL, addressedPrisons: string[]): { [p: string]: string } {
  return getRemoveFilterLinks(url, 'byAddressedPrison', addressedPrisons)
}
