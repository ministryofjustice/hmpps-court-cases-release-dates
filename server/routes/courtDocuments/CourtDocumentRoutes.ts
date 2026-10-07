import { RequestHandler } from 'express'
import dayjs from 'dayjs'
import { convertToTitleCase } from '../../utils/utils'
import FullPageError from '../../model/FullPageError'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import RemandAndSentencingService from '../../services/remandAndSentencingService'
import PrisonService from '../../services/prisonService'
import PrisonCourtDocumentWeekViewModel from '../../model/PrisonCourtDocumentWeekViewModel'
import PrisonCourtDocumentDayViewModel from '../../model/PrisonCourtDocumentDayViewModel'
import { supportView } from './access'

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

const inCaseload = (user: Express.User, prisonCode: string): boolean =>
  user.caseLoads?.some(caseLoad => caseLoad.caseLoadId === prisonCode) ?? false

const PICKER_THRESHOLD = 10

export default class CourtDocumentRoutes {
  constructor(
    private readonly courtDataIngestionService: CourtDataIngestionService,
    private readonly remandAndSentencingService: RemandAndSentencingService,
    private readonly prisonService: PrisonService,
  ) {}

  public previewing: RequestHandler = (req, res, next) => {
    const preview = asString(req.query.preview)
    if (req.session && preview === 'non-support') req.session.previewWithoutSupportRole = true
    if (req.session && preview === 'off') delete req.session.previewWithoutSupportRole

    res.locals.previewWithoutSupportRole = !!req.session?.previewWithoutSupportRole
    if (res.locals.previewWithoutSupportRole) {
      const url = new URL(req.originalUrl, 'http://localhost')
      url.searchParams.set('preview', 'off')
      res.locals.stopPreviewHref = url.pathname + url.search
    }
    next()
  }

  public prisons: RequestHandler = async (req, res) => {
    const { username } = res.locals.user
    const prisons = await this.prisonService.getAllPrisons(username)
    const sorted = prisons
      .filter(prison => inCaseload(res.locals.user, prison.prisonId))
      .sort((a, b) => a.prisonName.localeCompare(b.prisonName))

    const chosen = asString(req.query.prison).toUpperCase()
    if (chosen && sorted.some(prison => prison.prisonId === chosen)) {
      return res.redirect(`/court-documents/${chosen}`)
    }
    if (sorted.length === 1) return res.redirect(`/court-documents/${sorted[0].prisonId}`)

    return res.render('pages/courtDocuments/prisons', {
      prisons: sorted,
      supportView: supportView(req, res),
      picker: sorted.length > PICKER_THRESHOLD,
    })
  }

  public week: RequestHandler = async (req, res) => {
    const { username } = res.locals.user
    const prisonCode = asString(req.params.prisonCode).toUpperCase()
    if (!inCaseload(res.locals.user, prisonCode)) throw FullPageError.notInCaseLoadError()
    const date = asString(req.query.date) || dayjs().format('YYYY-MM-DD')

    const [week, prisonName] = await Promise.all([
      this.courtDataIngestionService.getPrisonCourtDocumentWeek(prisonCode, date, username),
      this.prisonService.getPrisonName(prisonCode, username),
    ])

    return res.render('pages/courtDocuments/week', {
      model: new PrisonCourtDocumentWeekViewModel(week, prisonName),
      supportView: supportView(req, res),
    })
  }

  public day: RequestHandler = async (req, res) => {
    const { username } = res.locals.user
    const prisonCode = asString(req.params.prisonCode).toUpperCase()
    if (!inCaseload(res.locals.user, prisonCode)) throw FullPageError.notInCaseLoadError()
    const date = asString(req.query.date)

    const [day, prisonName, prisons] = await Promise.all([
      this.courtDataIngestionService.getPrisonCourtDocumentDay(prisonCode, date, username),
      this.prisonService.getPrisonName(prisonCode, username),
      this.prisonService.getAllPrisons(username),
    ])
    const prisonNames = new Map(prisons.map(prison => [prison.prisonId, prison.prisonName]))

    const names = new Map(
      day.people
        .filter(person => person.lastName)
        .map(person => [
          person.prisonerNumber,
          `${convertToTitleCase(person.lastName)}, ${convertToTitleCase(person.firstName ?? '')}`.replace(/, $/, ''),
        ]),
    )

    const hearingIds = day.hearings.map(it => {
      return {
        hearingId: it.courtHearingId,
        prisonerNumber: it.prisonerNumber,
      }
    })
    const autocompleteEligibilty = await this.remandAndSentencingService.areHmctsHearingsEligibleForAutopopulate(
      hearingIds,
      username,
    )

    return res.render('pages/courtDocuments/day', {
      model: new PrisonCourtDocumentDayViewModel(day, prisonName, prisonNames, names, autocompleteEligibilty),
      supportView: supportView(req, res),
    })
  }
}
