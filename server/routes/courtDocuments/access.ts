import { Request, RequestHandler, Response } from 'express'
import config from '../../config'
import requireRole from '../../middleware/requireRole'
import { Role, Roles } from '../../@types/roles'

const SUPPORT = Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT)

const PRISON_ROLES = [
  Roles.getRole(Role.CCRD_DOCUMENTS),
  Roles.getRole(Role.RAS_DOCUMENT_AUTO),
  Roles.getRole(Role.RELEASE_DATES_CALCULATOR),
]

const holds = (user: Express.User, role: string): boolean => (user?.roles ?? []).includes(role)

export const canOpenCourtDocuments: RequestHandler = (req, res, next) => {
  const { user } = res.locals
  if (holds(user, SUPPORT)) return next()
  if (config.courtDocuments.openToPrisons && PRISON_ROLES.every(role => holds(user, role))) return next()
  return requireRole(SUPPORT)(req, res, next)
}

const hasSupportRole = (user: Express.User): boolean => holds(user, SUPPORT)

export const supportView = (req: Request, res: Response): boolean =>
  hasSupportRole(res.locals.user) && !req.session?.previewWithoutSupportRole
