import dayjs from 'dayjs'

export default class WeekDayRow {
  constructor(
    private readonly day: { date: string; documents: number; people: number },
    private readonly prisonCode: string,
  ) {}

  get label(): string {
    return dayjs(this.day.date).format('ddd D MMM')
  }

  get documents(): number {
    return this.day.documents
  }

  get people(): number {
    return this.day.people
  }

  get counts(): string {
    if (this.isEmpty) return 'Nothing arrived'
    const people = this.day.people === 1 ? '1 person' : `${this.day.people} people`
    const documents = this.day.documents === 1 ? '1 document' : `${this.day.documents} documents`
    return `${documents}, ${people}`
  }

  get isEmpty(): boolean {
    return this.day.documents === 0
  }

  get isToday(): boolean {
    return this.day.date === dayjs().format('YYYY-MM-DD')
  }

  /** Empty days get no link: there is nothing behind them, and a dead link invites a click. */
  get href(): string | null {
    return this.isEmpty ? null : `/court-documents/${this.prisonCode}/day?date=${this.day.date}`
  }
}
