export interface DeliveryNotification {
  type: 'success' | 'important'
  text: string
}

/** GOV.UK error summary entry, paired with the field it belongs to. */
export interface FormError {
  href: string
  text: string
  field: string
}
