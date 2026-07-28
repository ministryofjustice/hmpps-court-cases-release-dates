export type BackfillEnvironment = 'production' | 'pre-production' | 'development' | 'local' | 'unknown'

export interface BackfillTarget {
  host: string
  environment: BackfillEnvironment
  label: string
  isProduction: boolean
}

const LABELS: Record<BackfillEnvironment, string> = {
  production: 'production',
  'pre-production': 'pre-production',
  development: 'development',
  local: 'local',
  unknown: 'an unrecognised environment',
}

function environmentFor(host: string): BackfillEnvironment {
  if (host.startsWith('court-data-ingestion-api-preprod.')) return 'pre-production'
  if (host === 'court-data-ingestion-api.hmpps.service.justice.gov.uk') return 'production'
  return 'development'
}

export default function describeBackfillTarget(apiUrl: string): BackfillTarget {
  let host: string
  try {
    host = new URL(apiUrl).hostname
  } catch {
    host = apiUrl
  }

  const environment = environmentFor(host)

  return {
    host,
    environment,
    label: LABELS[environment],
    isProduction: environment === 'production',
  }
}
