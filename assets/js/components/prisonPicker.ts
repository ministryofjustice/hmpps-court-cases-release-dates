import accessibleAutocomplete from 'accessible-autocomplete'

const PRISON_SELECT_ID = 'prison-picker'

export default function initAll() {
  const select = document.getElementById(PRISON_SELECT_ID)
  if (!select) return

  accessibleAutocomplete.enhanceSelectElement({
    selectElement: select as HTMLSelectElement,
    showAllValues: true,
    defaultValue: '',
  })
}
