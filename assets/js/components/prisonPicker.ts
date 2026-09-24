import accessibleAutocomplete from 'accessible-autocomplete'

const PRISON_SELECT_ID = 'prison-picker'

/**
 * Turns the prison select into a typeahead. Progressive enhancement: without javascript the
 * select and its button still work, which is why the page renders a real form.
 */
export default function initAll() {
  const select = document.getElementById(PRISON_SELECT_ID)
  if (!select) return

  accessibleAutocomplete.enhanceSelectElement({
    selectElement: select as HTMLSelectElement,
    showAllValues: true,
    defaultValue: '',
  })
}
