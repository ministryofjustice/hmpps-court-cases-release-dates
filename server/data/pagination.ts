import { DocumentSearchResult } from '../@types/documentManagementApi/types'

type PageLink = {
  href: string
}

type NumberedPageLink = {
  number?: number
  href?: string
  current?: boolean
  ellipsis?: boolean
}

type ResultsMetaData = {
  from: number
  to: number
  count: number
}

type PageViewModel = {
  previous: PageLink | null
  next: PageLink | null
  items: NumberedPageLink[]
}
type PagedDataRequest = {
  offset: number
  pageNumber: number
}
type PagedDataResponse = {
  totalPages: number
  numberOfElements: number
  pageable: PagedDataRequest
  totalElements: number
  first: boolean
  last: boolean
}
export function getPagedDataResponse(documentSearchResult: DocumentSearchResult): PagedDataResponse {
  const pagedDataRequest = {
    offset: documentSearchResult.request.page * documentSearchResult.request.pageSize,
    pageNumber: documentSearchResult.request.page,
  } as PagedDataRequest
  const totalPages = Math.ceil(documentSearchResult.totalResultsCount / documentSearchResult.request.pageSize)
  const pagedDataResponse = {
    totalPages,
    numberOfElements: documentSearchResult.results.length,
    pageable: pagedDataRequest,
    totalElements: documentSearchResult.totalResultsCount,
    first: documentSearchResult.request.page === 0,
    last: documentSearchResult.request.page === totalPages - 1,
  } as PagedDataResponse
  return pagedDataResponse
}

export function govukPagination(pagedDataResponse: PagedDataResponse, url: URL): PageViewModel | null {
  if (pagedDataResponse.totalPages > 1) {
    return {
      previous: getPrevious(pagedDataResponse, url),
      next: getNext(pagedDataResponse, url),
      items: getNumberedPageItems(pagedDataResponse, url),
    }
  }
  return null
}

export function getPaginationResults(pagedDataResponse: PagedDataResponse): ResultsMetaData {
  return {
    from: pagedDataResponse.pageable.offset + 1,
    to: pagedDataResponse.pageable.offset + pagedDataResponse.numberOfElements,
    count: pagedDataResponse.totalElements,
  }
}

function getNumberedPageItems(pagedDataResponse: PagedDataResponse, url: URL): NumberedPageLink[] {
  url.searchParams.set('pageNumber', '1')
  const numberedPageLinks = [
    {
      number: 1,
      href: url.href,
      current: pagedDataResponse.first,
    } as NumberedPageLink,
  ]
  if (pagedDataResponse.pageable.pageNumber >= 3) {
    numberedPageLinks.push({
      ellipsis: true,
    })
  }
  numberPageRange(
    pagedDataResponse,
    pagedDataResponse.pageable.pageNumber,
    pagedDataResponse.pageable.pageNumber + 2,
  ).forEach(pageNumber => {
    url.searchParams.set('pageNumber', pageNumber.toString())
    numberedPageLinks.push({
      number: pageNumber,
      href: url.href,
      current: pageNumber === pagedDataResponse.pageable.pageNumber + 1,
    } as NumberedPageLink)
  })
  if (pagedDataResponse.pageable.pageNumber < pagedDataResponse.totalPages - 3) {
    numberedPageLinks.push({
      ellipsis: true,
    })
  }
  url.searchParams.set('pageNumber', pagedDataResponse.totalPages.toString())
  numberedPageLinks.push({
    number: pagedDataResponse.totalPages,
    href: url.href,
    current: pagedDataResponse.last,
  } as NumberedPageLink)
  return numberedPageLinks
}

function numberPageRange(pagedDataResponse: PagedDataResponse, start: number, end: number): number[] {
  return Array.from({ length: end + 1 - start }, (_, key) => key + start).filter(
    i => i > 1 && i < pagedDataResponse.totalPages,
  )
}

function getPrevious(pagedDataResponse: PagedDataResponse, url: URL): PageLink | null {
  url.searchParams.set('pageNumber', pagedDataResponse.pageable.pageNumber.toString())
  return (
    (!pagedDataResponse.first && {
      href: url.href,
    }) ||
    null
  )
}

function getNext(pagedDataResponse: PagedDataResponse, url: URL): PageLink | null {
  url.searchParams.set('pageNumber', (pagedDataResponse.pageable.pageNumber + 2).toString())
  return (
    (!pagedDataResponse.last && {
      href: url.href,
    }) ||
    null
  )
}
