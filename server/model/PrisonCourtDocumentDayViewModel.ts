import dayjs from 'dayjs'
import { PrisonCourtDocumentDay } from '../@types/courtDataIngestionApi/prisonCourtDocumentTypes'
import HearingListViewModel from './HearingListViewModel'
import { HmctsHearingAutopopulateEligibility } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class PrisonCourtDocumentDayViewModel {
  readonly list: HearingListViewModel

  constructor(
    private readonly day: PrisonCourtDocumentDay,
    readonly prisonName: string,
    prisonNames: Map<string, string> = new Map(),
    names: Map<string, string> = new Map(),
    autocompleteEligibilty: HmctsHearingAutopopulateEligibility[] = [],
  ) {
    this.list = new HearingListViewModel(
      day.hearings,
      day.documentsWithoutAHearing,
      day.prisonCode,
      prisonNames,
      names,
      autocompleteEligibilty,
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
