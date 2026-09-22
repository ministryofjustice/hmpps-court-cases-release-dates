import { RequestHandler } from 'express'
import dayjs from 'dayjs'
import FullPageError from '../../model/FullPageError'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import RemandAndSentencingService from '../../services/remandAndSentencingService'
import PrisonService from '../../services/prisonService'
import PrisonCourtDocumentWeekViewModel from '../../model/PrisonCourtDocumentWeekViewModel'
import PrisonCourtDocumentDayViewModel from '../../model/PrisonCourtDocumentDayViewModel'
import { emptyCourtContext, PersonCourtContext } from '../../model/hearingAction'

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

const inCaseload = (user: Express.User, prisonCode: string): boolean =>
  user.caseLoads?.some(caseLoad => caseLoad.caseLoadId === prisonCode) ?? false

function inBatches<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, batch) =>
    items.slice(batch * size, (batch + 1) * size),
  )
}

/** Splits a sorted list down columns, so it still reads alphabetically top to bottom. */
function intoColumns<T>(items: T[], columns: number): T[][] {
  const perColumn = Math.ceil(items.length / columns)

  return Array.from({ length: columns }, (_, column) => items.slice(column * perColumn, (column + 1) * perColumn))
}

/** Enough to keep a day quick without opening fifty connections to remand and sentencing at once. */
const LOOKUP_CONCURRENCY = 5

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

    return res.render('pages/courtDocuments/prisons', { prisons: intoColumns(sorted, 3) })
  }

  public week: RequestHandler = async (req, res) => {
    const { username } = res.locals.user
    const prisonCode = asString(req.params.prisonCode).toUpperCase()
    // The same rule as a person's pages, which every link on this page leads to.
    if (!inCaseload(res.locals.user, prisonCode)) throw FullPageError.notInCaseLoadError()
    const date = asString(req.query.date) || dayjs().format('YYYY-MM-DD')

    const [week, prisonName] = await Promise.all([
      this.courtDataIngestionService.getPrisonCourtDocumentWeek(prisonCode, date, username),
      this.prisonService.getPrisonName(prisonCode, username),
    ])

    return res.render('pages/courtDocuments/week', {
      model: new PrisonCourtDocumentWeekViewModel(week, prisonName),
    })
  }

  public day: RequestHandler = async (req, res) => {
    const { username } = res.locals.user
    const prisonCode = asString(req.params.prisonCode).toUpperCase()
    // The same rule as a person's pages, which every link on this page leads to.
    if (!inCaseload(res.locals.user, prisonCode)) throw FullPageError.notInCaseLoadError()
    const date = asString(req.query.date)

    const [day, prisonName, prisons] = await Promise.all([
      this.courtDataIngestionService.getPrisonCourtDocumentDay(prisonCode, date, username),
      this.prisonService.getPrisonName(prisonCode, username),
      this.prisonService.getAllPrisons(username),
    ])
    const prisonNames = new Map(prisons.map(prison => [prison.prisonId, prison.prisonName]))

    // Asked once per person rather than once per hearing: the API returns the day's people
    // deduplicated for exactly this.
    const contextByPrisoner = await this.courtContextFor(day.prisonerNumbers, username)

    return res.render('pages/courtDocuments/day', {
      model: new PrisonCourtDocumentDayViewModel(day, prisonName, contextByPrisoner, prisonNames),
    })
  }

  private async courtContextFor(prisonerNumbers: string[], username: string): Promise<Map<string, PersonCourtContext>> {
    const contexts = new Map<string, PersonCourtContext>()

    // Batches run one after another, so a busy day does not open fifty connections to remand and
    // sentencing at the same time. Chained rather than looped because awaiting in a loop is what
    // this is avoiding.
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
                // Someone we could not ask about falls back to the manual route, which is true
                // rather than optimistic, and leaves the rest of the page intact.
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
