import { Request } from 'express'
import { FacetResult } from '../@types/documentManagementApi/types'
import { getSortLink } from './pagination'
import { getAsArrayOrDefault, getAsStringOrDefault } from '../utils/utils'
import config from '../config'

export type DocumentFilters = {
  baseUrl: URL
  showing: string
  byCaseReferences: string[]
  facets?: { [p: string]: FacetResult }
  pagination: {
    sortBy: string
    pageNumber: number
  }
  sortLink: {
    mostRecent: string
    earliest: string
  }
  removeFilterLink: {
    showing: string
    caseReferences: { [p: string]: string }
  }
}

export function buildDocumentFilters(req: Request): DocumentFilters {
  const baseUrl = new URL(req.originalUrl, config.domain)
  const showing = getAsStringOrDefault(req.query.showing, 'all')
  const byCaseReferences = getAsArrayOrDefault(req.query.byCaseReference, 'all')
  const sortByQuery = getAsStringOrDefault(req.query.sortBy, 'MOST_RECENT')
  const pageNumber = parseInt(getAsStringOrDefault(req.query.pageNumber, '1'), 10)

  return {
    baseUrl,
    showing,
    byCaseReferences,
    pagination: {
      sortBy: sortByQuery,
      pageNumber,
    },
    sortLink: {
      mostRecent: getSortLink(baseUrl, 'MOST_RECENT'),
      earliest: getSortLink(baseUrl, 'EARLIEST'),
    },
    removeFilterLink: {
      showing: getShowingRemoveFilterLink(baseUrl),
      caseReferences: getCaseReferencesRemoveFilterLinks(baseUrl, byCaseReferences),
    },
  }
}

// Builds a link to the current page with the given sortBy applied, preserving all other existing query params (e.g. filters)
export function getShowingRemoveFilterLink(url: URL): string {
  const linkUrl = new URL(url)
  linkUrl.searchParams.delete('showing')
  return linkUrl.href
}

export function getCaseReferencesRemoveFilterLinks(url: URL, caseReferences: string[]): { [p: string]: string } {
  return caseReferences.reduce(
    (acc, caseReference) => {
      acc[caseReference] = getCaseReferenceRemoveFilterLink(url, caseReference)
      return acc
    },
    {} as { [p: string]: string },
  )
}

function getCaseReferenceRemoveFilterLink(url: URL, caseReference: string): string {
  const linkUrl = new URL(url)

  const caseReferences = linkUrl.searchParams.getAll('byCaseReference')
  linkUrl.searchParams.delete('pageNumber')
  linkUrl.searchParams.delete('byCaseReference')

  if (caseReference === 'all' || caseReference === 'none') {
    return linkUrl.href
  }

  const removedCaseReferences = caseReferences.filter(value => value !== caseReference)

  if (removedCaseReferences.length === 0) {
    return linkUrl.href
  }

  // The apply-filters checkboxes submit repeated byCaseReference params, so mirror that format here rather than a comma-joined value
  removedCaseReferences.forEach(value => linkUrl.searchParams.append('byCaseReference', value))
  return linkUrl.href
}
