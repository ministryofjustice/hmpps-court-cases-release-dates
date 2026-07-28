import type { Request, Response } from 'express'
import requireRole from './requireRole'

const next = jest.fn()

function responseWithRoles(roles?: string[]): Response {
  return {
    locals: roles === undefined ? {} : { user: { username: 'user1', roles } },
    redirect: jest.fn(),
  } as unknown as Response
}

const req = { method: 'GET', originalUrl: '/config' } as Request

beforeEach(() => {
  jest.resetAllMocks()
})

describe('requireRole', () => {
  it('calls next when the user holds the required role', () => {
    const res = responseWithRoles(['COURTCASE_RELEASEDATE_SUPPORT'])

    requireRole('COURTCASE_RELEASEDATE_SUPPORT')(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('accepts the required role with or without the ROLE_ prefix', () => {
    const res = responseWithRoles(['COURTCASE_RELEASEDATE_SUPPORT'])

    requireRole('ROLE_COURTCASE_RELEASEDATE_SUPPORT')(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('calls next when the user holds any one of several accepted roles', () => {
    const res = responseWithRoles(['SOMETHING_ELSE', 'COURTCASE_RELEASEDATE_SUPPORT'])

    requireRole('RELEASE_DATES_CALCULATOR', 'COURTCASE_RELEASEDATE_SUPPORT')(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('redirects to the auth error page when the user does not hold the role', () => {
    const res = responseWithRoles(['RELEASE_DATES_CALCULATOR'])

    requireRole('COURTCASE_RELEASEDATE_SUPPORT')(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.redirect).toHaveBeenCalledWith('/authError')
  })

  it('redirects when the user has no roles at all', () => {
    const res = responseWithRoles([])

    requireRole('COURTCASE_RELEASEDATE_SUPPORT')(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith('/authError')
  })

  it('redirects rather than throwing when there is no user on res.locals', () => {
    const res = responseWithRoles(undefined)

    requireRole('COURTCASE_RELEASEDATE_SUPPORT')(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.redirect).toHaveBeenCalledWith('/authError')
  })
})
