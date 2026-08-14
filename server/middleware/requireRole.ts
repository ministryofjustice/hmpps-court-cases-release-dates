import { RequestHandler } from 'express'
import { constants } from 'node:http2'
import logger from '../../logger'

export type OnDenied = 'redirect' | 'forbidden'

export function requireRoleWith(onDenied: OnDenied, ...requiredRoles: string[]): RequestHandler {
  const normalised = requiredRoles.map(role => (role.startsWith('ROLE_') ? role.substring('ROLE_'.length) : role))

  return (req, res, next) => {
    const roles: string[] = res.locals?.user?.roles ?? []

    if (normalised.some(role => roles.includes(role))) {
      return next()
    }

    logger.warn(
      `User ${res.locals?.user?.username} denied ${req.method} ${req.originalUrl}: requires one of ${normalised.join(', ')}`,
    )

    if (onDenied === 'forbidden') {
      return res.status(constants.HTTP_STATUS_FORBIDDEN).end()
    }
    return res.redirect('/authError')
  }
}

export default function requireRole(...requiredRoles: string[]): RequestHandler {
  return requireRoleWith('redirect', ...requiredRoles)
}
