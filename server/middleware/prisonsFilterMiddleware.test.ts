import jwt from 'jsonwebtoken'
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
      prisoner: ({ prisonId } as Prisoner),
    } as Request
  }
  const res = { locals: { user: { username: 'user1' } } } as unknown as Response

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should call next when prison id is present in filter', () => {
    req = requestForPrison('HLI')
    prisonsFilterMiddleware(['MDI', 'HLI'])(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('should call next when filter is configure with wildcard', () => {
    req = requestForPrison('HLI')
    prisonsFilterMiddleware(['*'])(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('should throw FullPageError when prison id is not present in filter', () => {
    req = requestForPrison('ABC')

    testForException(['HLI'])
  })

  it('should throw FullPageError when prison id is present but filter is empty array', () => {
    req = requestForPrison('ABC')

    testForException([])
  })

  it('should throw FullPageError when prison id is present but filter is empty string array', () => {
    req = requestForPrison('ABC')

    testForException([''])
  })

  it('should throw FullPageError when prison id is present but filter is null array', () => {
    req = requestForPrison('ABC')

    testForException([null])
  })


  it('should throw FullPageError when prison id is present but filter is undefined array', () => {
    req = requestForPrison('ABC')

    testForException([undefined])
  })

  function testForException(permittedPrisonIds: string[]) {
    let thrown: FullPageError
    try {
      prisonsFilterMiddleware(permittedPrisonIds)(req, res, next)
    } catch (error) {
      thrown = error as FullPageError
    }

    expect(thrown).toBeInstanceOf(FullPageError)
    expect(thrown.errorKey).toBe(FullPageErrorType.PRISONER_NOT_IN_PERMITTED_PRISON)
    expect(thrown.status).toBe(404)
    expect(next).not.toHaveBeenCalled()
  }

})
