export function useReloadPage(url?: string | URL) {
  return () => {
    window.history.replaceState(null, '', url)
    window.location.reload()
    // trigger React suspense forever, to display loading spinner until the page is refreshed
    throw new Promise(() => {})
  }
}
