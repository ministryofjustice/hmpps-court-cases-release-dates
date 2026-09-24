import dayjs from 'dayjs'
import { PrisonCourtDocumentWeek } from '../@types/courtDataIngestionApi/prisonCourtDocumentTypes'
import WeekDayRow from './WeekDayRow'

/** How far back the sidebar goes. Far enough to find a quiet week, short enough to scan. */
const RECENT_WEEKS = 10

export default class PrisonCourtDocumentWeekViewModel {
  readonly days: WeekDayRow[]

  constructor(
    private readonly week: PrisonCourtDocumentWeek,
    readonly prisonName: string,
  ) {
    this.days = week.days.map(day => new WeekDayRow(day, week.prisonCode))
  }

  get previousHref(): string {
    return this.weekLink(dayjs(this.week.from).subtract(1, 'week')).href
  }

  /** Null on the current week, so no forward link is rendered rather than one that is refused. */
  get nextHref(): string | null {
    const next = dayjs(this.week.from).add(1, 'week')
    return next.isAfter(this.thisMonday) ? null : this.weekLink(next).href
  }

  get previousLabel(): string {
    return this.weekLink(dayjs(this.week.from).subtract(1, 'week')).label
  }

  get nextLabel(): string | null {
    const next = dayjs(this.week.from).add(1, 'week')
    return next.isAfter(this.thisMonday) ? null : this.weekLink(next).label
  }

  get latestHref(): string {
    return `/court-documents/${this.week.prisonCode}`
  }

  /** True when the week being viewed is older than the list reaches, so the list shows an ellipsis. */
  get olderThanListed(): boolean {
    return !this.recentWeeks.slice(0, RECENT_WEEKS).some(week => week.isCurrent)
  }

  /**
   * The current week first, then the ones before it, whichever week is being viewed. A week
   * further back than the list reaches is added on the end, so the one you are on is always there,
   * shown as plain text rather than a link.
   */
  get recentWeeks(): { label: string; href: string; isCurrent: boolean }[] {
    const weeks = Array.from({ length: RECENT_WEEKS }, (_, back) =>
      this.weekLink(this.thisMonday.subtract(back, 'week')),
    )

    return weeks.some(week => week.isCurrent) ? weeks : [...weeks, this.weekLink(dayjs(this.week.from))]
  }

  private get thisMonday(): dayjs.Dayjs {
    return dayjs().subtract((dayjs().day() + 6) % 7, 'day')
  }

  private weekLink(monday: dayjs.Dayjs) {
    return {
      label: `${monday.format('D MMM')} to ${monday.add(6, 'day').format('D MMM')}`,
      href: `/court-documents/${this.week.prisonCode}?date=${monday.format('YYYY-MM-DD')}`,
      isCurrent: monday.format('YYYY-MM-DD') === this.week.from,
    }
  }

  get totalDocuments(): number {
    return this.week.totalDocuments
  }

  get rollSize(): number {
    return this.week.rollSize
  }
}
