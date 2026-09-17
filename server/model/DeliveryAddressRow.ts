import { UnclassifiedAddress } from '../@types/courtDataIngestionApi/deliveryAddressTypes'

export default class DeliveryAddressRow {
  constructor(private readonly address: UnclassifiedAddress) {}

  get emailAddress(): string {
    return this.address.emailAddress
  }

  get id(): string {
    return encodeURIComponent(this.address.emailAddress)
  }

  get documentCount(): number {
    return this.address.documentCount
  }

  get notIdentified(): number {
    return this.address.documentCount - this.address.matchedToPersonCount
  }

  get firstSeen(): string {
    return this.address.firstSeen
  }

  get lastSeen(): string {
    return this.address.lastSeen
  }

  get categoryCode(): string {
    return this.address.categoryCode ?? ''
  }

  get prisonCode(): string {
    return this.address.prisonCode ?? ''
  }

  get documentTypes(): string {
    return this.address.recentDocumentTypes.join(', ')
  }

  get isActive(): boolean {
    const fortnightAgo = new Date()
    fortnightAgo.setDate(fortnightAgo.getDate() - 14)
    return new Date(this.address.lastSeen) >= fortnightAgo
  }
}
