import dayjs from 'dayjs'
import { PrisonCourtDocumentDay } from '../@types/courtDataIngestionApi/prisonCourtDocumentTypes'
import { PersonCourtContext } from './hearingAction'
import HearingListViewModel from './HearingListViewModel'

export default class PrisonCourtDocumentDayViewModel {
  readonly list: HearingListViewModel

  constructor(
    private readonly day: PrisonCourtDocumentDay,
    readonly prisonName: string,
    contextByPrisoner: Map<string, PersonCourtContext>,
    prisonNames: Map<string, string> = new Map(),
    names: Map<string, string> = new Map(),
  ) {
    this.list = new HearingListViewModel(
      day.hearings,
      day.documentsWithoutAHearing,
      day.prisonCode,
      contextByPrisoner,
      prisonNames,
      names,
    )
  }

  get dateLabel(): string {
    return dayjs(this.day.date).format('dddd D MMMM YYYY')
  }

  get weekHref(): string {
    return `/court-documents/${this.day.prisonCode}?date=${this.day.date}`
  }

  get rollSize(): number {
    return this.day.rollSize
  }
}
