import FullPageErrorType from './FullPageErrorType'

class FullPageError extends Error {
  errorKey: FullPageErrorType

  status: number

  static notInCaseLoadError(): FullPageError {
    const error = new FullPageError('Prisoner is not in caseload')
    error.errorKey = FullPageErrorType.NOT_IN_CASELOAD
    error.status = 404
    return error
  }

  static prisonerOutError(): FullPageError {
    const error = new FullPageError('Prisoner is out')
    error.errorKey = FullPageErrorType.PRISONER_OUT
    error.status = 404
    return error
  }

  static userNotInPermittedPrisonError(): FullPageError {
    const error = new FullPageError('User is not in an allowed prison')
    error.errorKey = FullPageErrorType.USER_NOT_IN_PERMITTED_PRISON
    error.status = 404
    return error
  }
}

export default FullPageError
