import describeBackfillTarget from './backfillTarget'

describe('describeBackfillTarget', () => {
  it('recognises production', () => {
    const target = describeBackfillTarget('https://court-data-ingestion-api.hmpps.service.justice.gov.uk')

    expect(target.environment).toBe('production')
    expect(target.isProduction).toBe(true)
    expect(target.host).toBe('court-data-ingestion-api.hmpps.service.justice.gov.uk')
  })

  it('recognises development', () => {
    const target = describeBackfillTarget('https://court-data-ingestion-api-dev.hmpps.service.justice.gov.uk')

    expect(target.environment).toBe('development')
    expect(target.isProduction).toBe(false)
  })

  it('recognises pre-production', () => {
    const target = describeBackfillTarget('https://court-data-ingestion-api-preprod.hmpps.service.justice.gov.uk')

    expect(target.environment).toBe('pre-production')
    expect(target.isProduction).toBe(false)
  })

  it('recognises local', () => {
    expect(describeBackfillTarget('http://localhost:8083').environment).toBe('local')
  })

  it('does not treat an unrecognised host as production', () => {
    const target = describeBackfillTarget('https://somewhere-else.example.com')

    expect(target.environment).toBe('unknown')
    expect(target.isProduction).toBe(false)
    expect(target.host).toBe('somewhere-else.example.com')
  })

  it('does not mistake a preprod host for production on a substring match', () => {
    expect(
      describeBackfillTarget('https://court-data-ingestion-api-preprod.hmpps.service.justice.gov.uk').isProduction,
    ).toBe(false)
  })

  it('falls back to the raw value when the url will not parse', () => {
    const target = describeBackfillTarget('not a url')

    expect(target.host).toBe('not a url')
    expect(target.environment).toBe('unknown')
  })
})
