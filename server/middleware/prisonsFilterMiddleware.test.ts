import type { Request, Response } from 'express'

import prisonsFilterMiddleware from './prisonsFilterMiddleware'
import { Prisoner } from '../@types/prisonerSearchApi/types'
import FullPageError from '../model/FullPageError'
import FullPageErrorType from '../model/FullPageErrorType'

describe('prisonsFilterMiddleware', () => {
  let req: Request
  const next = jest.fn()
  function requestForPrison(prisonId: string): Request {
    return {
      originalUrl: '/prisoner/A1234AA/readonly-overview',
      prisoner: { prisonId } as Prisoner,
    } as Request
  }
  function responseForCaseload(activeCaseLoadId: string): Response {
    return { locals: { user: { username: 'user1', activeCaseLoadId } } } as unknown as Response
  }

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should call next when active caseload id is present in filter', () => {
    req = requestForPrison('HLI')
    prisonsFilterMiddleware(['MDI', 'HLI'])(req, responseForCaseload('HLI'), next)

    expect(next).toHaveBeenCalled()
  })

  it('should call next when filter is configure with wildcard', () => {
    req = requestForPrison('HLI')
    prisonsFilterMiddleware(['*'])(req, responseForCaseload('HLI'), next)

    expect(next).toHaveBeenCalled()
  })

  it('should throw FullPageError when active caseload id is not present in filter', () => {
    req = requestForPrison('ABC')

    testForException(['HLI'])
  })

  it('should throw FullPageError when active caseload id is present but filter is empty array', () => {
    req = requestForPrison('ABC')

    testForException([])
  })

  it('should throw FullPageError when active caseload id is present but filter is empty string array', () => {
    req = requestForPrison('ABC')

    testForException([''])
  })

  it('should throw FullPageError when active caseload id is present but filter is null array', () => {
    req = requestForPrison('ABC')

    testForException([null])
  })

  it('should throw FullPageError when active caseload id is present but filter is undefined array', () => {
    req = requestForPrison('ABC')

    testForException([undefined])
  })

  function testForException(permittedPrisonIds: string[]) {
    let thrown: FullPageError
    try {
      prisonsFilterMiddleware(permittedPrisonIds)(req, responseForCaseload('abc'), next)
    } catch (error) {
      thrown = error as FullPageError
    }

    expect(thrown).toBeInstanceOf(FullPageError)
    expect(thrown.errorKey).toBe(FullPageErrorType.USER_NOT_IN_PERMITTED_PRISON)
    expect(thrown.status).toBe(404)
    expect(next).not.toHaveBeenCalled()
  }
})
