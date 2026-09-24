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

/**
 * The unmatched documents page requires the support role, so only offer it to someone who has it.
 * The page checks for itself too: this is so the link goes when the rest of the section opens up
 * to prison staff.
 */
const canSeeUnmatched = (user: Express.User): boolean =>
  (user.roles ?? []).includes(Role.COURTCASE_RELEASEDATE_SUPPORT.replace('ROLE_', ''))

function inBatches<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, batch) =>
    items.slice(batch * size, (batch + 1) * size),
  )
}

/** Enough to keep a day quick without opening fifty connections to remand and sentencing. */
const LOOKUP_CONCURRENCY = 5

/** Above this many prisons, the page offers a typeahead rather than a list. */
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
      // A handful is a list to read; more than that is a list to search.
      picker: sorted.length > PICKER_THRESHOLD,
    })
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
      canSeeUnmatched: canSeeUnmatched(res.locals.user),
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

    // Names come with the day, from the roll, so only remand and sentencing has to be asked.
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
