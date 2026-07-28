import type { RequestHandler } from 'express'
import logger from '../../logger'
import FullPageError from '../model/FullPageError'

export default function prisonsFilterMiddleware(permittedPrisonIds: string[] = []): RequestHandler {
  return (req, res, next) => {
    const { prisoner } = req
    if (prisoner && (permittedPrisonIds.includes(prisoner.prisonId) || permittedPrisonIds.includes('*'))) {
      return next()
    }

    logger.warn(`This prisoner is linked to a restricted prison on this path`)
    throw FullPageError.prisonerNotInPermittedPrisonError()
  }
}
