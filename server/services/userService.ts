import { jwtDecode } from 'jwt-decode'
import { convertToTitleCase } from '../utils/utils'
import type { User } from '../data/manageUsersApiClient'
import ManageUsersApiClient from '../data/manageUsersApiClient'
import PrisonerService from './prisonerService'
import { PrisonApiUserCaseloads } from '../@types/prisonApi/types'
import { Role, Roles } from '../@types/roles'

export interface UserDetails extends User {
  displayName: string
  roles: string[]
  userRoles: string[]
  hasRasAccess: boolean
  hasRecallsAccess: boolean
  hasInactiveBookingAccess: boolean
  hasReadOnlyNomisConfigAccess: boolean
  hasImmigrationDetentionAccess: boolean
  caseLoads: PrisonApiUserCaseloads[]
  caseloadDescriptions: string[]
  caseloadMap: Map<string, string>
}

export default class UserService {
  constructor(
    private readonly manageUsersApiClient: ManageUsersApiClient,
    private readonly prisonerService: PrisonerService,
  ) {}

  async getUser(token: string): Promise<UserDetails> {
    const [user, userCaseloads] = await Promise.all([
      this.manageUsersApiClient.getUser(token),
      this.prisonerService.getUsersCaseloads(token),
    ])
    const roles = this.getUserRoles(token)
    return {
      ...user,
      roles,
      userRoles: roles.map(role => `ROLE_${role}`),
      displayName: convertToTitleCase(user.name),
      hasRasAccess: this.hasRasAccess(roles),
      hasRecallsAccess: this.hasRecallAccess(roles),
      hasInactiveBookingAccess: this.hasInactiveBookingAccess(roles),
      hasReadOnlyNomisConfigAccess: this.hasReadOnlyNomisConfigAccess(roles),
      hasImmigrationDetentionAccess: this.hasImmigrationDetentionAccess(roles),
      caseLoads: userCaseloads,
      caseloadDescriptions: userCaseloads.map(uc => uc.description),
      caseloadMap: new Map(userCaseloads.map(uc => [uc.caseLoadId, uc.description])),
    }
  }

  getUserRoles(token: string): string[] {
    const { authorities: roles = [] } = jwtDecode(token) as { authorities?: string[] }
    return roles.map(role => role.substring(role.indexOf('_') + 1))
  }

  hasRasAccess(roles: string[]): boolean {
    return [Roles.getRole(Role.REMAND_AND_SENTENCING), Roles.getRole(Role.COURT_CASES)].some((role: string) =>
      roles.includes(role),
    )
  }

  hasRecallAccess(roles: string[]): boolean {
    return [Roles.getRole(Role.RECALL_MAINTAINER), Roles.getRole(Role.COURT_CASES)].some((role: string) =>
      roles.includes(role),
    )
  }

  hasInactiveBookingAccess(roles: string[]): boolean {
    return roles.includes(Roles.getRole(Role.INACTIVE_BOOKINGS))
  }

  hasReadOnlyNomisConfigAccess(roles: string[]): boolean {
    return roles.includes(Roles.getRole(Role.COURTCASE_RELEASEDATE_SUPPORT))
  }

  hasImmigrationDetentionAccess(roles: string[]): boolean {
    return [
      Roles.getRole(Role.IMMIGRATION_DETENTION_USER),
      Roles.getRole(Role.IMMIGRATION_DETENTION_ADMIN),
      Roles.getRole(Role.COURT_CASES),
    ].some((role: string) => roles.includes(role))
  }
}
