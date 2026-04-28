/* eslint-disable no-param-reassign */
import path from 'path'
import nunjucks from 'nunjucks'
import express from 'express'
import { filesize } from 'filesize'
import {
  personProfileName,
  personDateOfBirth,
  personStatus,
  firstNameSpaceLastName,
  hmppsFormatDate,
  createSupportLink,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import dayjs from 'dayjs'
import fs from 'fs'
import { initialiseName } from './utils'
import { ApplicationInfo } from '../applicationInfo'
import config from '../config'
import logger from '../../logger'

const production = process.env.NODE_ENV === 'production'

export default function nunjucksSetup(app: express.Express, applicationInfo: ApplicationInfo): void {
  app.set('view engine', 'njk')

  app.locals.asset_path = '/assets/'
  app.locals.applicationName = 'Court cases, adjustments and release dates'
  app.locals.environmentName = config.environmentName
  app.locals.environmentNameColour = config.environmentName === 'PRE-PRODUCTION' ? 'govuk-tag--green' : ''
  app.locals.digitalPrisonServicesUrl = config.applications.digitalPrisonServices.url
  app.locals.adjustmentsUiUrl = config.applications.adjustments.url
  app.locals.recallsUiUrl = config.applications.recordARecall.url
  app.locals.appInsightsConnectionString = config.appInsightsConnectionString
  app.locals.appInsightsApplicationName = applicationInfo.applicationName
  app.locals.buildNumber = config.buildNumber
  app.locals.calculateReleaseDatesUiUrl = config.applications.calculateReleaseDates.url
  app.locals.immigrationDetentionEnabled = config.applications.immigrationDetention.enabled

  if (config.environmentName === 'LOCAL') {
    app.locals.environment = 'local'
  } else if (config.environmentName === 'DEV') {
    app.locals.environment = 'dev'
  } else if (config.environmentName === 'PRE-PRODUCTION') {
    app.locals.environment = 'pre'
  } else {
    app.locals.environment = 'prod'
  }

  // Cachebusting version string
  if (production) {
    // Version only changes with new commits
    app.locals.version = applicationInfo.gitShortHash
  } else {
    // Version changes every request
    app.use((req, res, next) => {
      res.locals.version = Date.now().toString()
      return next()
    })
  }

  let assetManifest: Record<string, string> = {}

  try {
    const assetMetadataPath = path.resolve(__dirname, '../../assets/manifest.json')
    assetManifest = JSON.parse(fs.readFileSync(assetMetadataPath, 'utf8'))
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') {
      logger.error(e, 'Could not read asset manifest file')
    }
  }
  const njkEnv = nunjucks.configure(
    [
      path.join(__dirname, '../../server/views'),
      'node_modules/govuk-frontend/dist/',
      'node_modules/govuk-frontend/dist/components/',
      'node_modules/@ministryofjustice/frontend/',
      'node_modules/@ministryofjustice/frontend/moj/components/',
      'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/',
      'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/components/',
    ],
    {
      autoescape: true,
      express: app,
    },
  )

  njkEnv.addGlobal('createSupportLink', createSupportLink)
  njkEnv.addGlobal('applications', config.applications)

  njkEnv.addFilter('initialiseName', initialiseName)
  njkEnv.addFilter('personProfileName', personProfileName)
  njkEnv.addFilter('personDateOfBirth', personDateOfBirth)
  njkEnv.addFilter('personStatus', personStatus)
  njkEnv.addFilter('date', date => dayjs(date).format('DD MMMM YYYY'))
  njkEnv.addFilter('dateTime', date => `${dayjs(date).format('dddd, DD MMMM YYYY')} at ${dayjs(date).format('HH:mm')}`)
  njkEnv.addFilter('firstNameSpaceLastName', firstNameSpaceLastName)
  njkEnv.addFilter('hmppsFormatDate', hmppsFormatDate)
  njkEnv.addFilter('pluralise', (word, number, appender) => (number === 1 ? word : `${word}${appender || 's'}`))
  njkEnv.addFilter('assetMap', (url: string) => assetManifest[url] || url)
  njkEnv.addFilter('uppercase', text => text.toUpperCase())
  njkEnv.addFilter('humanReadableFileSize', (numberOfBytes: number) =>
    filesize(numberOfBytes || 0, { base: 2, standard: 'jedec' }),
  )
}
