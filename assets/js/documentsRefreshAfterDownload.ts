/**
 * Documents page: This module adds an event listener to refresh the documents tab after opening a NEW document for view/download in a new tab.
 *
 * - When viewing/downloading a new document, it triggers a metadata update on the backend marking the document as no longer new.
 * - Documents list should reload to refresh new tag for the document as no longer New.
 *
 * What:
 * - This module initializes whilst loading the documents page, when links to download documents tagged as "New" are found.
 * - During initialization, it adds an event listener for clicks only inside #document-search-results. And only to NEW document download links (.document--new ... /download/).
 * - Only those documents identified as "New" will be added to the listener
 *
 * How:
 * - After clicking a NEW document download link, a pending flag is set on sessionStorage.
 * - It triggers a timeout for reloading the page of FALLBACK_RELOAD_DELAY_MS that will work even whilst the documents list is not in focus.
 * - Turning the focus back to the documents tab, will trigger a faster timeout of QUICK_RELOAD_ON_RETURN_DELAY_MS overriding the initial one.
 * - Clicks on non-new documents will not trigger any reload.
 *
 * Assumptions:
 * This module assumes the following contract with the documents.njk template:
 * - template must render the following elements:
 *   - container id: #document-search-results (this is required for initializing the event listener)
 *   - NEW document wrapper class: .document--new (this is required for identifying new documents, otherwise no link clicks will be listened to)
 *   - download link target pattern: /documents/:uuid/download/:filename (this is to help identify the download link)
 */
const DOWNLOAD_LINK_EVENT_SCOPE_SELECTOR = '#document-search-results'
const DOCUMENT_DOWNLOAD_LINK_SELECTOR = '.document--new a[target="_blank"][href*="/documents/"][href*="/download/"]'
const DOCUMENTS_PAGE_REFRESH_PENDING_KEY = 'ccrd:documents:refresh-pending'

const QUICK_RELOAD_ON_RETURN_DELAY_MS = 100
const FALLBACK_RELOAD_DELAY_MS = 1500

let isDocumentsPageReloading = false
let fallbackReloadTimerId: number | null = null
let quickReloadTimerId: number | null = null

// This functions handles the use only one of the timeouts, clearing the other one if it is still pending. This is to avoid multiple reloads of the page.
const clearTimers = () => {
  if (fallbackReloadTimerId !== null) window.clearTimeout(fallbackReloadTimerId)
  if (quickReloadTimerId !== null) window.clearTimeout(quickReloadTimerId)
  fallbackReloadTimerId = null
  quickReloadTimerId = null
}

// This function controls if a reload is ongoing or finished. It prevents reloading if the pending flag is not set, and if the flag is set, it clears the timers and reloads the page.
const reloadDocumentsPageIfPending = () => {
  if (isDocumentsPageReloading) return
  if (sessionStorage.getItem(DOCUMENTS_PAGE_REFRESH_PENDING_KEY) !== '1') return

  sessionStorage.removeItem(DOCUMENTS_PAGE_REFRESH_PENDING_KEY)
  isDocumentsPageReloading = true
  clearTimers()
  window.location.reload()
}

// Sets the default fallback reload timeout when clicking a new document download link. This timeout will trigger even if the documents page is not in focus.
const scheduleFallbackReload = () => {
  if (fallbackReloadTimerId !== null) window.clearTimeout(fallbackReloadTimerId)

  fallbackReloadTimerId = window.setTimeout(() => {
    reloadDocumentsPageIfPending()
  }, FALLBACK_RELOAD_DELAY_MS)
}

// Sets the quick reload timeout when returning to the documents page after clicking a new document download link. This timeout overrides the fallback one.
const scheduleQuickReloadOnReturn = () => {
  if (sessionStorage.getItem(DOCUMENTS_PAGE_REFRESH_PENDING_KEY) !== '1') return

  if (fallbackReloadTimerId !== null) {
    window.clearTimeout(fallbackReloadTimerId)
    fallbackReloadTimerId = null
  }

  if (quickReloadTimerId !== null) window.clearTimeout(quickReloadTimerId)
  quickReloadTimerId = window.setTimeout(() => {
    reloadDocumentsPageIfPending()
  }, QUICK_RELOAD_ON_RETURN_DELAY_MS)
}

// Get the main selector for the download links. If nothing is used, the response should prevent the module from initializing.
const getScopedDownloadLink = (target: EventTarget | null, scope: Element): HTMLAnchorElement | null => {
  if (!(target instanceof Element)) return null

  const link = target.closest(DOCUMENT_DOWNLOAD_LINK_SELECTOR) as HTMLAnchorElement | null
  if (!link) return null

  return scope.contains(link) ? link : null
}

// Loading the module, by initializing the event listeners for the download links and the page focus events. If no download scopem the the module will not initialize any event listeners.
const initDocumentsRefreshAfterDownload = () => {
  const downloadLinkEventScope = document.querySelector<HTMLElement>(DOWNLOAD_LINK_EVENT_SCOPE_SELECTOR)
  if (!downloadLinkEventScope) return

  downloadLinkEventScope.addEventListener(
    'click',
    (event: MouseEvent) => {
      const link = getScopedDownloadLink(event.target, downloadLinkEventScope)
      if (!link) return

      sessionStorage.setItem(DOCUMENTS_PAGE_REFRESH_PENDING_KEY, '1')
      scheduleFallbackReload()
    },
    true,
  )

  window.addEventListener('focus', scheduleQuickReloadOnReturn)
  window.addEventListener('pageshow', scheduleQuickReloadOnReturn)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleQuickReloadOnReturn()
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDocumentsRefreshAfterDownload)
} else {
  initDocumentsRefreshAfterDownload()
}
