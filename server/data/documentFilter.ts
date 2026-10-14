import { Request } from 'express'
import { FacetResult } from '../@types/documentManagementApi/types'
import { getSortLink } from './pagination'
import { getAsArrayOrDefault, getAsStringOrDefault } from '../utils/utils'
import config from '../config'

export type DocumentFilters = {
  baseUrl: URL
  baseUrlLink: string
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
  const byCaseReferences = getAsArrayOrDefault(req.query.byCaseReference, 'all')

  return {
    baseUrl,
    baseUrlLink: getBaseUrlLink(baseUrl),
    showing: getAsStringOrDefault(req.query.showing, 'all'),
    byCaseReferences,
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
  return linkUrl.pathname
}

// Builds a link to the current page with the given sortBy applied, preserving all other existing query params (e.g. filters)
export function getShowingRemoveFilterLink(url: URL): string {
  const linkUrl = new URL(url)
  linkUrl.searchParams.delete('showing')
  return linkUrl.href
}

export function getCaseReferencesRemoveFilterLinks(url: URL, caseReferences: string[]): { [p: string]: string } {
  return getRemoveFilterLinks(url, 'byCaseReference', caseReferences)
}

export function getRemoveFilterLinks(url: URL, filterName: string, filterValues: string[]): { [p: string]: string } {
  return filterValues.reduce(
    (acc, filterValue) => {
      acc[filterValue] = getRemoveFilterLink(url, filterName, filterValue)
      return acc
    },
    {} as { [p: string]: string },
  )
}

function getRemoveFilterLink(url: URL, filterName: string, filterValue: string): string {
  const linkUrl = new URL(url)

  const allFilterValues = linkUrl.searchParams.getAll(filterName)
  linkUrl.searchParams.delete('pageNumber')
  linkUrl.searchParams.delete(filterName)

  if (filterValue === 'all' || filterValue === 'none') {
    return linkUrl.href
  }

  const removedFilterValues = allFilterValues.filter(value => value !== filterValue)

  if (removedFilterValues.length === 0) {
    return linkUrl.href
  }

  removedFilterValues.forEach(value => linkUrl.searchParams.append(filterName, value))
  return linkUrl.href
}
