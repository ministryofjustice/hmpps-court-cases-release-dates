import { jwtDecode } from 'jwt-decode'
import { convertToTitleCase } from '../utils/utils'
import type { User } from '../data/manageUsersApiClient'
import ManageUsersApiClient from '../data/manageUsersApiClient'
import PrisonerService from './prisonerService'

export interface UserDetails extends User {
  displayName: string
  roles: string[]
  hasRasAccess: boolean
  hasInactiveBookingAccess: boolean
  hasReadOnlyNomisConfigAccess: boolean
  hasImmigrationDetentionAccess: boolean
  caseloads: string[]
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
      displayName: convertToTitleCase(user.name),
      hasRasAccess: this.hasRasAccess(roles),
      hasInactiveBookingAccess: this.hasInactiveBookingAccess(roles),
      hasReadOnlyNomisConfigAccess: this.hasReadOnlyNomisConfigAccess(roles),
      hasImmigrationDetentionAccess: this.hasImmigrationDetentionAccess(roles),
      caseloads: userCaseloads.map(uc => uc.caseLoadId),
      caseloadDescriptions: userCaseloads.map(uc => uc.description),
      caseloadMap: new Map(userCaseloads.map(uc => [uc.caseLoadId, uc.description])),
    }
  }

  getUserRoles(token: string): string[] {
    const { authorities: roles = [] } = jwtDecode(token) as { authorities?: string[] }
    return roles.map(role => role.substring(role.indexOf('_') + 1))
  }

  hasRasAccess(roles: string[]): boolean {
    return roles.includes('REMAND_AND_SENTENCING')
  }

  hasInactiveBookingAccess(roles: string[]): boolean {
    return roles.includes('INACTIVE_BOOKINGS')
  }

  hasReadOnlyNomisConfigAccess(roles: string[]): boolean {
    return roles.includes('COURTCASE_RELEASEDATE_SUPPORT')
  }

  hasImmigrationDetentionAccess(roles: string[]): boolean {
    return roles.includes('IMMIGRATION_DETENTION_USER') || roles.includes('IMMIGRATION_DETENTION_ADMIN')
  }
}
