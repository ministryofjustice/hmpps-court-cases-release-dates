import * as govukFrontend from 'govuk-frontend'
import * as mojFrontend from '@ministryofjustice/frontend'
import * as toggleAllCourtCases from './components/toggleAllCourtCases'
import prisonPicker from './components/prisonPicker'

govukFrontend.initAll()
mojFrontend.initAll()
toggleAllCourtCases.initAll()
prisonPicker()
