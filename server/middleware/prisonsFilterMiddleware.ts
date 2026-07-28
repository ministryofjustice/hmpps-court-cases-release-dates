import type { RequestHandler } from 'express'
import logger from '../../logger'
import FullPageError from '../model/FullPageError'

export default function prisonsFilterMiddleware(permittedPrisonIds: string[] = []): RequestHandler {
  return (_req, res, next) => {
    if (permittedPrisonIds.includes(res.locals?.user?.activeCaseLoadId) || permittedPrisonIds.includes('*')) {
      return next()
    }

    logger.warn(`This user is linked to a restricted prison on this path`)
    throw FullPageError.userNotInPermittedPrisonError()
  }
}
