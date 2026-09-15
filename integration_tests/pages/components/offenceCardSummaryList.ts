import { type Locator, type Page } from '@playwright/test'

export type KeyValuePair = {
  key: Locator
  value: Locator
}

export default class OffenceCardSummaryList {
  private readonly root: Locator | Page

  constructor(root: Locator | Page) {
    this.root = root
  }

  get sentenceDate(): Promise<KeyValuePair[]> {
    return this.getKeyValuePairs('Sentence date')
  }

  get outcome(): Promise<KeyValuePair[]> {
    return this.getKeyValuePairs('Outcome')
  }

  get committedOn(): Promise<KeyValuePair[]> {
    return this.getKeyValuePairs('Committed on')
  }

  private async getKeyValuePairs(rowLabel: string | RegExp): Promise<KeyValuePair[]> {
    const rowDetails: Locator = this.getOffenceCardRowDetails(rowLabel)

    const rowList: Locator[] = await rowDetails.all()
    return rowList.map((row: Locator) => ({
      key: row.locator(':scope > .govuk-summary-list__key'),
      value: row.locator(':scope > .govuk-summary-list__value'),
    }))
  }

  private getOffenceCardRowDetails(rowLabel: string | RegExp): Locator {
    const hasText = typeof rowLabel === 'string' ? new RegExp(`^\\s*${rowLabel}\\s*$`) : rowLabel

    return this.root.locator('.govuk-summary-list__row').filter({
      has: this.root.locator(':scope > .govuk-summary-list__key', { hasText }),
    })
  }
}
