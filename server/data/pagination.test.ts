import { DocumentSearchResult } from '../@types/documentManagementApi/types'
import { govukPagination, getPaginationResults, getPagedDataResponse } from './pagination'

describe('pagination tests', () => {
  const baseUrl = new URL('http://localhost/')
  it('returns null if only 1 page', () => {
    const searchResult = {
      request: {
        pageSize: 10,
      },
      results: [{}, {}, {}],
      totalResultsCount: 1,
    } as DocumentSearchResult
    const paged = getPagedDataResponse(searchResult)
    const result = govukPagination(paged, baseUrl)
    expect(result).toBeNull()
  })

  it('shows previous if not on first page', () => {
    const searchResult = {
      request: {
        page: 1,
        pageSize: 10,
      },
      results: [{}, {}, {}],
      totalResultsCount: 13,
    } as DocumentSearchResult
    const paged = getPagedDataResponse(searchResult)
    const result = govukPagination(paged, baseUrl)
    expect(result.previous).toEqual({
      href: `http://localhost/?pageNumber=1`,
    })
  })

  it('show next if not on last page', () => {
    const searchResult = {
      request: {
        page: 0,
        pageSize: 10,
      },
      results: [{}, {}, {}],
      totalResultsCount: 25,
    } as DocumentSearchResult
    const paged = getPagedDataResponse(searchResult)
    const result = govukPagination(paged, baseUrl)
    expect(result.next).toEqual({
      href: `http://localhost/?pageNumber=2`,
    })
  })

  it('shows correct results', () => {
    const searchResult = {
      request: {
        page: 1,
        pageSize: 10,
      },
      results: [{}, {}, {}],
      totalResultsCount: 13,
    } as DocumentSearchResult
    const paged = getPagedDataResponse(searchResult)
    const result = getPaginationResults(paged)
    expect(result).toEqual({
      from: 11,
      to: 13,
      count: 13,
    })
  })

  it('shows ellipsis between range and last', () => {
    const searchResult = {
      request: {
        page: 0,
        pageSize: 10,
      },
      results: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
      totalResultsCount: 48,
    } as DocumentSearchResult
    const paged = getPagedDataResponse(searchResult)
    const result = govukPagination(paged, baseUrl)
    expect(result.items).toEqual([
      {
        number: 1,
        href: 'http://localhost/?pageNumber=1',
        current: true,
      },
      {
        number: 2,
        href: 'http://localhost/?pageNumber=2',
        current: false,
      },
      {
        ellipsis: true,
      },
      {
        number: 5,
        href: 'http://localhost/?pageNumber=5',
        current: false,
      },
    ])
  })

  it('show all pages', () => {
    const searchResult = {
      request: {
        page: 2,
        pageSize: 10,
      },
      results: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
      totalResultsCount: 48,
    } as DocumentSearchResult
    const paged = getPagedDataResponse(searchResult)
    const result = govukPagination(paged, baseUrl)
    expect(result.items).toEqual([
      {
        number: 1,
        href: 'http://localhost/?pageNumber=1',
        current: false,
      },
      {
        number: 2,
        href: 'http://localhost/?pageNumber=2',
        current: false,
      },
      {
        number: 3,
        href: 'http://localhost/?pageNumber=3',
        current: true,
      },
      {
        number: 4,
        href: 'http://localhost/?pageNumber=4',
        current: false,
      },
      {
        number: 5,
        href: 'http://localhost/?pageNumber=5',
        current: false,
      },
    ])
  })

  it('show ellipse between range and first', () => {
    const searchResult = {
      request: {
        page: 3,
        pageSize: 10,
      },
      results: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
      totalResultsCount: 48,
    } as DocumentSearchResult
    const paged = getPagedDataResponse(searchResult)
    const result = govukPagination(paged, baseUrl)
    expect(result.items).toEqual([
      {
        number: 1,
        href: 'http://localhost/?pageNumber=1',
        current: false,
      },
      {
        ellipsis: true,
      },
      {
        number: 3,
        href: 'http://localhost/?pageNumber=3',
        current: false,
      },
      {
        number: 4,
        href: 'http://localhost/?pageNumber=4',
        current: true,
      },
      {
        number: 5,
        href: 'http://localhost/?pageNumber=5',
        current: false,
      },
    ])
  })
})
