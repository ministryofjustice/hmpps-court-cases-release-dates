import { UnclassifiedAddress } from '../@types/courtDataIngestionApi/deliveryAddressTypes'
import DeliveryAddressRow from './DeliveryAddressRow'
import { DeliveryNotification } from './deliveryAddress'

export default class DeliveryAddressOverviewViewModel {
  readonly rows: DeliveryAddressRow[]

  constructor(
    addresses: UnclassifiedAddress[],
    readonly notification?: DeliveryNotification,
  ) {
    this.rows = addresses
      .map(address => new DeliveryAddressRow(address))
      .sort((a, b) => b.documentCount - a.documentCount)
  }

  get totalDocuments(): number {
    return this.rows.reduce((total, row) => total + row.documentCount, 0)
  }

  get totalAddresses(): number {
    return this.rows.length
  }
}
