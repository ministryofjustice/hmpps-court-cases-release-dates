export enum Role {
  /** @deprecated This will be removed in a future release. Use COURT_CASES instead. */
  REMAND_AND_SENTENCING = 'ROLE_REMAND_AND_SENTENCING',
  /** @deprecated This will be removed in a future release. Use COURT_CASES instead. */
  RECALL_MAINTAINER = 'ROLE_RECALL_MAINTAINER',
  /** @deprecated This will be removed in a future release. Use COURT_CASES instead. */
  IMMIGRATION_DETENTION_USER = 'ROLE_IMMIGRATION_DETENTION_USER',
  /** @deprecated This will be removed in a future release. Use COURT_CASES instead. */
  IMMIGRATION_DETENTION_ADMIN = 'ROLE_IMMIGRATION_DETENTION_ADMIN',
  INACTIVE_BOOKINGS = 'ROLE_INACTIVE_BOOKINGS',
  COURTCASE_RELEASEDATE_SUPPORT = 'ROLE_COURTCASE_RELEASEDATE_SUPPORT',
  COURT_CASES = 'ROLE_COURT_CASES',
  RELEASE_DATES_CALCULATOR = 'ROLE_RELEASE_DATES_CALCULATOR'
}

export const Roles = {
  getAuthority(role: Role): string {
    return role
  },

  getRole(role: Role): string {
    return role.replace(/^ROLE_/, '')
  },

  values(): Role[] {
    return Object.values(Role) as Role[]
  },
}
