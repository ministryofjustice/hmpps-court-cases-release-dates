import { RequestHandler } from 'express'
import PrisonerSearchService from '../services/prisonerSearchService'
import logger from '../../logger'
import FullPageError from '../model/FullPageError'

export default function getPrisoner(prisonerSearchService: PrisonerSearchService): RequestHandler {
  return async (req, res, next) => {
    const { user } = res.locals
    const { prisonerNumber } = req.params

    if (user && prisonerNumber) {
      try {
        const prisoner = await prisonerSearchService.getByPrisonerNumber(res.locals.user.username, prisonerNumber)
        req.prisoner = prisoner
        const isInCaseload = user.caseLoads?.some(caseLoad => caseLoad.caseLoadId === prisoner.prisonId)
        const isPrisonerOutside = prisoner.prisonId === 'OUT'
        const isPrisonerBeingTransferred = prisoner.prisonId === 'TRN'
        if (!isInCaseload && !(user.hasInactiveBookingAccess && (isPrisonerOutside || isPrisonerBeingTransferred))) {
          throw FullPageError.notInCaseLoadError()
        }
        if (isPrisonerOutside && !user.hasInactiveBookingAccess) {
          throw FullPageError.prisonerOutError()
        }
      } catch (error) {
        logger.error(error, `Failed to get prisoner with prisoner number: ${prisonerNumber}`)
        return next(error)
      }
    }

    return next()
  }
}
