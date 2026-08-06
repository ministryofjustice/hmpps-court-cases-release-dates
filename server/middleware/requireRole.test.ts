import type { Request, Response } from 'express'
import requireRole from './requireRole'
import { Role, Roles } from '../@types/roles'

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
