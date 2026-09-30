import { AuditServiceFactory } from '@ministryofjustice/hmpps-audit-client'
import logger from '../../logger'

// Widen SUBJECT_TYPE to `string` so callers can use service-specific subject types
// (e.g. DELIVERY_CATEGORY, DELIVERY_ADDRESS) alongside the standard SubjectType values.
export default AuditServiceFactory.configureFromEnv<string, string>(logger)
