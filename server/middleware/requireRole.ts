import { RequestHandler } from 'express'
import logger from '../../logger'

export default function requireRole(...requiredRoles: string[]): RequestHandler {
  const normalised = requiredRoles.map(role => (role.startsWith('ROLE_') ? role.substring('ROLE_'.length) : role))

  return (req, res, next) => {
    const roles: string[] = res.locals?.user?.roles ?? []

    if (normalised.some(role => roles.includes(role))) {
      return next()
    }

    logger.warn(
      `User ${res.locals?.user?.username} denied ${req.method} ${req.originalUrl}: requires one of ${normalised.join(', ')}`,
    )
    return res.redirect('/authError')
  }
}
