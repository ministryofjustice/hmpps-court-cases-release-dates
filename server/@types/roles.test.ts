import { Role, Roles } from './roles'

describe('Roles', () => {
  it('should return the role string as-is for getAuthority', () => {
    expect(Roles.getAuthority(Role.COURT_CASES)).toBe('ROLE_COURT_CASES')
  })

  it('should strip the ROLE_ prefix for getRole', () => {
    expect(Roles.getRole(Role.COURT_CASES)).toBe('COURT_CASES')
  })

  it('should return all defined roles for values', () => {
    expect(Roles.values()).toEqual(Object.values(Role))
  })
})
