export const TOGGLE_ALL_SUMMARY_ID = 'toggle-all-court-cases-summary'
export const TOGGLE_ALL_DETAILS_ID = 'toggle-all-court-cases-details'

export function initAll() {
  const toggleAllCourtCasesDetails: HTMLElement | null = document.getElementById(TOGGLE_ALL_DETAILS_ID)
  const toggleAllCourtCasesSummary: HTMLElement | null = document.getElementById(TOGGLE_ALL_SUMMARY_ID)
  if (toggleAllCourtCasesSummary && toggleAllCourtCasesDetails) {
    toggleAllCourtCasesSummary.addEventListener('click', () => {
      const courtCaseDetailsCardList: HTMLDialogElement[] = Array.from(
        document.querySelectorAll<HTMLDialogElement>('.court-case-details-card__details'),
      ).filter(p => {
        return p.id !== TOGGLE_ALL_DETAILS_ID
      })
      const isToggleAllCourtCasesOpen: boolean = toggleAllCourtCasesDetails.hasAttribute('open')
      courtCaseDetailsCardList.forEach((d: HTMLDialogElement) => {
        if (isToggleAllCourtCasesOpen) {
          d.removeAttribute('open')
        } else {
          d.setAttribute('open', '')
        }
      })
    })
  }
}
