import { RequestHandler } from 'express'
import dayjs from 'dayjs'
import { convertToTitleCase } from '../../utils/utils'
import FullPageError from '../../model/FullPageError'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import RemandAndSentencingService from '../../services/remandAndSentencingService'
import PrisonService from '../../services/prisonService'
import { Role } from '../../@types/roles'
import PrisonCourtDocumentWeekViewModel from '../../model/PrisonCourtDocumentWeekViewModel'
import PrisonCourtDocumentDayViewModel from '../../model/PrisonCourtDocumentDayViewModel'
import { emptyCourtContext, PersonCourtContext } from '../../model/hearingAction'

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

const inCaseload = (user: Express.User, prisonCode: string): boolean =>
  user.caseLoads?.some(caseLoad => caseLoad.caseLoadId === prisonCode) ?? false

const canSeeUnmatched = (user: Express.User): boolean =>
  (user.roles ?? []).includes(Role.COURTCASE_RELEASEDATE_SUPPORT.replace('ROLE_', ''))

function inBatches<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, batch) =>
    items.slice(batch * size, (batch + 1) * size),
  )
}

const LOOKUP_CONCURRENCY = 5

const PICKER_THRESHOLD = 10

export default class CourtDocumentRoutes {
  constructor(
    private readonly courtDataIngestionService: CourtDataIngestionService,
    private readonly remandAndSentencingService: RemandAndSentencingService,
    private readonly prisonService: PrisonService,
  ) {}

  public prisons: RequestHandler = async (req, res) => {
    const { username } = res.locals.user
    const prisons = await this.prisonService.getAllPrisons(username)
    const sorted = prisons
      .filter(prison => inCaseload(res.locals.user, prison.prisonId))
      .sort((a, b) => a.prisonName.localeCompare(b.prisonName))

    // Where the picker was used, or there is only one prison to pick, go straight there.
    const chosen = asString(req.query.prison).toUpperCase()
    if (chosen && sorted.some(prison => prison.prisonId === chosen)) {
      return res.redirect(`/court-documents/${chosen}`)
    }
    if (sorted.length === 1) return res.redirect(`/court-documents/${sorted[0].prisonId}`)

    return res.render('pages/courtDocuments/prisons', {
      prisons: sorted,
      canSeeUnmatched: canSeeUnmatched(res.locals.user),
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
      canSeeUnmatched: canSeeUnmatched(res.locals.user),
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
    const contextByPrisoner = await this.courtContextFor(
      day.people.map(person => person.prisonerNumber),
      username,
    )

    return res.render('pages/courtDocuments/day', {
      model: new PrisonCourtDocumentDayViewModel(day, prisonName, contextByPrisoner, prisonNames, names),
    })
  }

  private async courtContextFor(prisonerNumbers: string[], username: string): Promise<Map<string, PersonCourtContext>> {
    const contexts = new Map<string, PersonCourtContext>()

    await inBatches(prisonerNumbers, LOOKUP_CONCURRENCY).reduce(
      (previous, batch) =>
        previous.then(async () => {
          await Promise.all(
            batch.map(async prisonerNumber => {
              try {
                contexts.set(
                  prisonerNumber,
                  await this.remandAndSentencingService.getCourtContext(prisonerNumber, username),
                )
              } catch {
                contexts.set(prisonerNumber, emptyCourtContext())
              }
            }),
          )
        }),
      Promise.resolve(),
    )

    return contexts
  }
}
