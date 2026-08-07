const DOCUMENTS_PAGE_PATH_REGEX = /^\/prisoner\/[^/]+\/documents\/?$/
const DOWNLOAD_LINK_EVENT_SCOPE_SELECTOR = '#document-search-results'
const DOCUMENT_DOWNLOAD_LINK_SELECTOR = '.document--new a[target="_blank"][href*="/documents/"][href*="/download/"]'
const DOCUMENTS_PAGE_REFRESH_PENDING_KEY = 'ccrd:documents:refresh-pending'

const QUICK_RELOAD_ON_RETURN_DELAY_MS = 100
const FALLBACK_RELOAD_DELAY_MS = 1500

let isDocumentsPageReloading = false
let fallbackReloadTimerId: number | null = null
let quickReloadTimerId: number | null = null

const clearTimers = () => {
  if (fallbackReloadTimerId !== null) window.clearTimeout(fallbackReloadTimerId)
  if (quickReloadTimerId !== null) window.clearTimeout(quickReloadTimerId)
  fallbackReloadTimerId = null
  quickReloadTimerId = null
}

const reloadDocumentsPageIfPending = () => {
  if (isDocumentsPageReloading) return
  if (sessionStorage.getItem(DOCUMENTS_PAGE_REFRESH_PENDING_KEY) !== '1') return

  sessionStorage.removeItem(DOCUMENTS_PAGE_REFRESH_PENDING_KEY)
  isDocumentsPageReloading = true
  clearTimers()
  window.location.reload()
}

const scheduleFallbackReload = () => {
  if (fallbackReloadTimerId !== null) window.clearTimeout(fallbackReloadTimerId)

  fallbackReloadTimerId = window.setTimeout(() => {
    reloadDocumentsPageIfPending()
  }, FALLBACK_RELOAD_DELAY_MS)
}

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

const getScopedDownloadLink = (target: EventTarget | null, scope: Element): HTMLAnchorElement | null => {
  if (!(target instanceof Element)) return null

  const link = target.closest(DOCUMENT_DOWNLOAD_LINK_SELECTOR) as HTMLAnchorElement | null
  if (!link) return null

  return scope.contains(link) ? link : null
}

const initDocumentsRefreshAfterDownload = () => {
  if (!DOCUMENTS_PAGE_PATH_REGEX.test(window.location.pathname)) return

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
