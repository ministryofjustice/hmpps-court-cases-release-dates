import accessibleAutocomplete from 'accessible-autocomplete'

const FILTER_SELECTOR = '.js-autocomplete-select'

export default function initAll() {
  document.querySelectorAll<HTMLSelectElement>(FILTER_SELECTOR).forEach(selectElement => {
    const inputId = selectElement.id
    const hasSelection = Array.from(selectElement.selectedOptions).some(option => option.value !== '')

    accessibleAutocomplete.enhanceSelectElement({
      selectElement,
      showAllValues: selectElement.getAttribute('data-showAllValues') === 'true',
      defaultValue: '',
      minLength: 2,
      placeholder: hasSelection ? '' : selectElement.getAttribute('data-placeholder'),
    })

    const input = document.getElementById(inputId)
    if (input instanceof HTMLInputElement) {
      input.value = ''
    }
  })
}
