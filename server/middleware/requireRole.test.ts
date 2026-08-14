import type { Request, Response } from 'express'
import { constants } from 'node:http2'
import requireRole, { requireRoleWith } from './requireRole'
import { Role, Roles } from '../@types/roles'

const next = jest.fn()

function responseWithRoles(roles?: string[]): Response {
  const res: Record<string, unknown> = {
    locals: roles === undefined ? {} : { user: { username: 'user1', roles } },
    redirect: jest.fn(),
    end: jest.fn(),
  }
  res.status = jest.fn(() => res)
  return res as unknown as Response
}

const req = { method: 'GET', originalUrl: '/config' } as Request

beforeEach(() => {
  jest.resetAllMocks()
})

describe('requireRole', () => {
  it('calls next when the user holds the required role', () => {
    const res = responseWithRoles([Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)])

    requireRole(Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT))(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('accepts the required role with or without the ROLE_ prefix', () => {
    const res = responseWithRoles([Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)])

    requireRole(Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT))(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('calls next when the user holds any one of several accepted roles', () => {
    const res = responseWithRoles(['SOMETHING_ELSE', Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)])

    requireRole(Roles.getRole(Role.RELEASE_DATES_CALCULATOR), Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT))(
      req,
      res,
      next,
    )

    expect(next).toHaveBeenCalled()
  })

  it('redirects to the auth error page when the user does not hold the role', () => {
    const res = responseWithRoles([Roles.getRole(Role.RELEASE_DATES_CALCULATOR)])

    requireRole(Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT))(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.redirect).toHaveBeenCalledWith('/authError')
  })

  it('redirects when the user has no roles at all', () => {
    const res = responseWithRoles([])

    requireRole(Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT))(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith('/authError')
  })

  it('redirects rather than throwing when there is no user on res.locals', () => {
    const res = responseWithRoles(undefined)

    requireRole(Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT))(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.redirect).toHaveBeenCalledWith('/authError')
  })
})

describe('requireRoleWith', () => {
  it('calls next when the user holds the required role, whichever denial mode is configured', () => {
    const res = responseWithRoles([Roles.getRole(Role.CCRD_DOCUMENTS)])

    requireRoleWith('forbidden', Roles.getRole(Role.CCRD_DOCUMENTS))(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('ends the response with 403 rather than redirecting when configured as forbidden', () => {
    const res = responseWithRoles([])

    requireRoleWith('forbidden', Roles.getRole(Role.CCRD_DOCUMENTS))(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(constants.HTTP_STATUS_FORBIDDEN)
    expect(res.end).toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('redirects when configured as redirect, matching the default export', () => {
    const res = responseWithRoles([])

    requireRoleWith('redirect', Roles.getRole(Role.CCRD_DOCUMENTS))(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith('/authError')
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 403 rather than throwing when there is no user on res.locals', () => {
    const res = responseWithRoles(undefined)

    requireRoleWith('forbidden', Roles.getRole(Role.CCRD_DOCUMENTS))(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(constants.HTTP_STATUS_FORBIDDEN)
  })
})
