import { dataAccess } from '../data'
import UserService from './userService'
import FeComponentsService from './feComponentsService'
import PrisonerSearchService from './prisonerSearchService'
import PrisonerService from './prisonerService'
import AdjustmentsService from './adjustmentsService'
import CalculateReleaseDatesService from './calculateReleaseDatesService'
import RemandAndSentencingService from './remandAndSentencingService'
import PrisonService from './prisonService'
import DocumentManagementService from './documentManagementService'
import CourtDataIngestionService from './courtDataIngestionService'
import CourtRegisterService from './courtRegisterService'
import ManageOffencesService from './manageOffencesService'
import ManageOffencesApiClient from '../data/manageOffencesApiClient'
import ImmigrationDetentionService from './ImmigrationDetentionService'

export const services = () => {
  const { applicationInfo, hmppsAuthClient, hmppsAuthenticationClient, manageUsersApiClient, feComponentsClient } =
    dataAccess()

  const feComponentsService = new FeComponentsService(feComponentsClient)

  const prisonerService = new PrisonerService(hmppsAuthClient)

  const userService = new UserService(manageUsersApiClient, prisonerService)

  const prisonerSearchService = new PrisonerSearchService(hmppsAuthClient)

  const adjustmentsService = new AdjustmentsService(hmppsAuthClient)

  const calculateReleaseDatesService = new CalculateReleaseDatesService(hmppsAuthClient)

  const remandAndSentencingService = new RemandAndSentencingService(hmppsAuthClient)

  const prisonService = new PrisonService(hmppsAuthClient)

  const documentManagementService = new DocumentManagementService(hmppsAuthenticationClient)

  const courtDataIngestionService = new CourtDataIngestionService(hmppsAuthClient)

  const courtRegisterService = new CourtRegisterService(hmppsAuthClient)

  const manageOffencesService = new ManageOffencesService(new ManageOffencesApiClient(hmppsAuthenticationClient))

  const immigrationDetentionService = new ImmigrationDetentionService()

  return {
    applicationInfo,
    userService,
    feComponentsService,
    prisonerService,
    prisonerSearchService,
    adjustmentsService,
    calculateReleaseDatesService,
    remandAndSentencingService,
    prisonService,
    documentManagementService,
    courtDataIngestionService,
    courtRegisterService,
    manageOffencesService,
    immigrationDetentionService,
  }
}

export type Services = ReturnType<typeof services>

export { UserService }
