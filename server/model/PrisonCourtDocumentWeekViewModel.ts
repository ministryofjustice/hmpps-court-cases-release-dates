import dayjs from 'dayjs'
import { PrisonCourtDocumentWeek } from '../@types/courtDataIngestionApi/prisonCourtDocumentTypes'
import WeekDayRow from './WeekDayRow'

const RECENT_WEEKS = 8

export default class PrisonCourtDocumentWeekViewModel {
  readonly days: WeekDayRow[]

  constructor(
    private readonly week: PrisonCourtDocumentWeek,
    readonly prisonName: string,
  ) {
    this.days = week.days.map(day => new WeekDayRow(day, week.prisonCode))
  }

  get recentWeeks(): { label: string; href: string; isCurrent: boolean }[] {
    const thisMonday = dayjs().subtract((dayjs().day() + 6) % 7, 'day')

    const weeks = Array.from({ length: RECENT_WEEKS }, (_, back) => this.weekLink(thisMonday.subtract(back, 'week')))

    return weeks.some(week => week.isCurrent) ? weeks : [...weeks, this.weekLink(dayjs(this.week.from))]
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
