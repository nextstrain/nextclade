import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { controlsHiddenWidth } from 'auspice/src/util/globals'

/**
 * Media query matching viewports wide enough to show the sidebar next to the page content: wider than Auspice's
 * `controlsHiddenWidth`, at or below which Auspice's sidebar covers its panels and starts closed
 */
const WIDE_VIEWPORT_QUERY = `(min-width: ${controlsHiddenWidth + 1}px)`

function matchWideViewport(): boolean {
  return typeof window === 'undefined' || window.matchMedia(WIDE_VIEWPORT_QUERY).matches
}

/** Whether the viewport is wide enough to show the sidebar next to the page content, rather than over it */
export const isWideViewportAtom = atom(matchWideViewport())

isWideViewportAtom.onMount = (setIsWide) => {
  const mediaQueryList = window.matchMedia(WIDE_VIEWPORT_QUERY)
  const update = () => setIsWide(mediaQueryList.matches)
  update()
  mediaQueryList.addEventListener('change', update)
  return () => mediaQueryList.removeEventListener('change', update)
}

/** Sidebar visibility on wide viewports, remembered between visits */
const isSidebarOpenOnWideViewportAtom = atomWithStorage('sidebar-open', true, undefined, { getOnInit: true })

/** Sidebar visibility on narrow viewports, where the sidebar covers the page content. Starts closed on every visit */
const isSidebarOpenOnNarrowViewportAtom = atom(false)

/** Whether the sidebar is shown. Writing it records the user's choice for the current viewport width */
export const isSidebarOpenAtom = atom(
  (get) => (get(isWideViewportAtom) ? get(isSidebarOpenOnWideViewportAtom) : get(isSidebarOpenOnNarrowViewportAtom)),
  (get, set, isOpen: boolean) => {
    if (get(isWideViewportAtom)) {
      set(isSidebarOpenOnWideViewportAtom, isOpen)
    } else {
      set(isSidebarOpenOnNarrowViewportAtom, isOpen)
    }
  },
)
