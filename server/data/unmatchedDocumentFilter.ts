import { Request } from 'express'
import { FacetResult, FacetValue } from '../@types/documentManagementApi/types'
import { getSortLink } from './pagination'
import { getAsArrayOrDefault, getAsStringOrDefault } from '../utils/utils'
import config from '../config'
import { getCaseReferencesRemoveFilterLinks, getRemoveFilterLinks } from './documentFilter'

export type DocumentFilters = {
  baseUrl: URL
  baseUrlLink: string
  byCaseReferences: string[]
  byAddressedPrisons: string[]
  byCourtCodes: string[]
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
    caseReferences: { [p: string]: string }
    addressedPrisons: { [p: string]: string }
    courtCodes: { [p: string]: string }
  }
}

export function buildDocumentFilters(req: Request): DocumentFilters {
  const baseUrl = new URL(req.originalUrl, config.domain)
  const byCaseReferences = getAsArrayOrDefault(req.query.byCaseReference, 'all')
  const byAddressedPrisons = getAsArrayOrDefault(req.query.byAddressedPrison, 'all')
  const byCourtCodes = getAsArrayOrDefault(req.query.byCourtCode, 'all')

  return {
    baseUrl,
    baseUrlLink: getBaseUrlLink(baseUrl),
    byCaseReferences,
    byAddressedPrisons,
    byCourtCodes,
    pagination: {
      sortBy: getAsStringOrDefault(req.query.sortBy, 'MOST_RECENT'),
      pageNumber: parseInt(getAsStringOrDefault(req.query.pageNumber, '1'), 10),
    },
    sortLink: {
      mostRecent: getSortLink(baseUrl, 'MOST_RECENT'),
      earliest: getSortLink(baseUrl, 'EARLIEST'),
    },
    removeFilterLink: {
      caseReferences: getCaseReferencesRemoveFilterLinks(baseUrl, byCaseReferences),
      addressedPrisons: getAddressedPrisonRemoveFilterLinks(baseUrl, byAddressedPrisons),
      courtCodes: getCourtCodeRemoveFilterLinks(baseUrl, byCourtCodes),
    },
  }
}

export function parseAddressedPrisonFacetForRendering(addressedPrisonFacet: FacetResult) {
  const noAddresseeFacet = addressedPrisonFacet?.values.filter(it => it.value === null) ?? [
    {
      value: null,
      count: 0,
    } as FacetValue,
  ]
  const withAddresseeFacet = addressedPrisonFacet?.values.filter(it => it.value != null) ?? []
  return [...noAddresseeFacet, ...withAddresseeFacet]
}

export function parseCourtCodeFacetForRendering(courtCodeFacet: FacetResult) {
  const noCourtCodeFacet = courtCodeFacet?.values.filter(it => it.value === null) ?? [
    {
      value: null,
      count: 0,
    } as FacetValue,
  ]

  const withCourtCodeFacet = courtCodeFacet?.values.filter(it => it.value != null) ?? []

  return [...noCourtCodeFacet, ...withCourtCodeFacet]
}

// Builds a link to the base page, clean of any filters or sorting options
function getBaseUrlLink(url: URL): string {
  const linkUrl = new URL(url)
  linkUrl.searchParams.delete('pageNumber')
  linkUrl.searchParams.delete('sortBy')
  linkUrl.searchParams.delete('showing')
  linkUrl.searchParams.delete('byCaseReference')
  linkUrl.searchParams.delete('byAddressedPrison')
  linkUrl.searchParams.delete('byCourtCode')
  return linkUrl.pathname
}

function getAddressedPrisonRemoveFilterLinks(url: URL, addressedPrisons: string[]): { [p: string]: string } {
  return getRemoveFilterLinks(url, 'byAddressedPrison', addressedPrisons)
}

function getCourtCodeRemoveFilterLinks(url: URL, courtCodes: string[]): { [p: string]: string } {
  return getRemoveFilterLinks(url, 'byCourtCode', courtCodes)
}
