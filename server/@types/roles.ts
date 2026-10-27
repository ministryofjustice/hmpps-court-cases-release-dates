export enum Role {
  INACTIVE_BOOKINGS = 'ROLE_INACTIVE_BOOKINGS',
  COURTCASE_RELEASEDATE_SUPPORT = 'ROLE_COURTCASE_RELEASEDATE_SUPPORT',
  COURT_CASES = 'ROLE_COURT_CASES',
  RELEASE_DATES_CALCULATOR = 'ROLE_RELEASE_DATES_CALCULATOR',
  RAS_DOCUMENT_AUTO = 'ROLE_RAS_DOCUMENT_AUTO',
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
