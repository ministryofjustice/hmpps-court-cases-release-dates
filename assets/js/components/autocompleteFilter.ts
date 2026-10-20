import accessibleAutocomplete from 'accessible-autocomplete'

export default function initAll() {
  document.querySelectorAll<HTMLSelectElement>(AutocompleteFilterMapper.FILTER_SELECTOR).forEach(filterElement => {
    const selectElement = filterElement
    const selectedOptions = AutocompleteFilterMapper.getSelectedOptions(selectElement)
    const availableOptions = AutocompleteFilterMapper.getAvailableOptions(selectElement)

    selectElement.selectedIndex = -1 // This will allow rendering the filter without selecting any option

    try {
      accessibleAutocomplete.enhanceSelectElement({
        selectElement,
        showAllValues: AutocompleteFilterMapper.isShowAllValues(selectElement),
        defaultValue: AutocompleteFilterMapper.DEFAULT_VALUE,
        minLength: AutocompleteFilterMapper.MIN_LENGTH,
        placeholder: AutocompleteFilterMapper.getPlaceholder(selectElement, selectedOptions),
        autoselect: AutocompleteFilterMapper.isAutoSelect(selectElement),
        source: applyFilter(availableOptions),
      })
    } finally {
      // Preserve the applied filters in the underlying select
      for (const option of selectedOptions) {
        option.selected = true
      }
    }
  })
}

function applyFilter(options: string[]) {
  return (query: string, populateResults: (results: string[]) => void) => {
    const lowerCasedQuery = query.trim().toLowerCase()

    if (!lowerCasedQuery) {
      populateResults(options)
      return
    }

    const filteredOptions = options.filter(option => option.toLowerCase().includes(lowerCasedQuery))
    populateResults(filteredOptions)
  }
}

export class AutocompleteFilterMapper {
  public static FILTER_SELECTOR: string = '.js-autocomplete-select'

  public static DEFAULT_VALUE: string = ''

  public static MIN_LENGTH: number = 2

  static getSelectedOptions(selectElement: HTMLSelectElement): HTMLOptionElement[] {
    return Array.from(selectElement.selectedOptions)
  }

  static getAvailableOptions(selectElement: HTMLSelectElement): string[] {
    return Array.from(selectElement.querySelectorAll('option'))
      .filter(option => !option.selected)
      .map(option => option.textContent || '')
  }

  static isShowAllValues(selectElement: HTMLSelectElement): boolean {
    return selectElement.getAttribute('data-showAllValues') === 'true'
  }

  static isAutoSelect(selectElement: HTMLSelectElement): boolean {
    return selectElement.getAttribute('data-showAllValues') !== 'true'
  }

  static getPlaceholder(selectElement: HTMLSelectElement, selectedOptions: HTMLOptionElement[]): string {
    return this.hasSelection(selectedOptions) ? '' : (selectElement.getAttribute('data-placeholder') ?? '')
  }

  private static hasSelection(selectedOptions: HTMLOptionElement[]): boolean {
    return selectedOptions.some(option => option.value !== '')
  }
}
