import React, { KeyboardEvent, ReactNode, useCallback, useId, useLayoutEffect, useRef } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import styled from 'styled-components'
import { SIDEBAR_THEME, SIDEBAR_WIDTH_PX } from 'src/components/Layout/sidebarTheme'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { isSidebarOpenAtom, isWideViewportAtom } from 'src/state/sidebar.state'

const TRANSITION = '0.3s ease-out'

/** Width of the pull tab beside the sidebar. Narrower than the page gutter, to keep a gap to the page content */
const PULL_TAB_WIDTH_PX = 12

/** Width of the shadow on the sidebar's right edge. The pull tab overlaps it, so that both look like one piece */
const SIDEBAR_EDGE_SHADOW_PX = 3

/** Narrowest strip of page content that stays visible next to the open sidebar on narrow viewports */
const MIN_UNCOVERED_CONTENT_PX = 40

export interface SidebarLayoutProps {
  /** Sidebar content. The page content takes the full width when omitted */
  sidebar?: ReactNode
  children: ReactNode
}

/**
 * Page layout with a collapsible sidebar on the left of the page content.
 *
 * The sidebar slides in and out within the page content area, so the app's navigation bar and footer stay visible.
 * A pull tab on the sidebar's right edge toggles it, and stays visible on the edge of the page content when closed.
 * On wide viewports the open sidebar takes space from the page content, and the user's open/closed choice is
 * remembered. On narrow viewports there is not enough room for both, so the open sidebar covers the page content
 * and closes on Escape or on a click on the uncovered content.
 */
export function SidebarLayout({ sidebar, children }: SidebarLayoutProps) {
  if (sidebar === undefined) {
    return (
      <Container>
        <Main>{children}</Main>
      </Container>
    )
  }
  return <SidebarLayoutWithSidebar sidebar={sidebar}>{children}</SidebarLayoutWithSidebar>
}

function SidebarLayoutWithSidebar({ sidebar, children }: Required<SidebarLayoutProps>) {
  const { t } = useTranslationSafe()
  const sidebarId = useId()
  const isWide = useAtomValue(isWideViewportAtom)
  const [isOpen, setIsOpen] = useAtom(isSidebarOpenAtom)
  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen, setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])
  const isOverlay = !isWide

  const railRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const pullTabRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const sidebarElem = sidebarRef.current
    if (!sidebarElem) {
      return
    }
    // Keep the closed sidebar out of keyboard focus and the accessibility tree. CSS `visibility` is not enough,
    // because some controls inside (e.g. react-select inputs) set `visibility: visible` themselves.
    // React 18 has no `inert` prop, so set the DOM property directly.
    // Keyboard focus inside the closing sidebar (e.g. after Escape) moves to the pull tab before `inert` is set.
    if (isOpen) {
      sidebarElem.inert = false
    } else {
      if (sidebarElem.contains(document.activeElement)) {
        pullTabRef.current?.focus({ preventScroll: true })
      }
      sidebarElem.inert = true
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Controls inside (such as dropdowns) prevent the default when they handle Escape themselves
      if (isOverlay && event.key === 'Escape' && !event.defaultPrevented) {
        close()
      }
    },
    [close, isOverlay],
  )

  // The sidebar always slides over the page content, so the content never changes size and is never re-rendered
  const indentPx = 0
  const pullTabLabel = isOpen ? t('Hide sidebar') : t('Show sidebar')

  return (
    <Container>
      <Rail ref={railRef} onKeyDown={handleKeyDown} $isOpen={isOpen}>
        <Sidebar ref={sidebarRef} id={sidebarId} aria-label={t('Sidebar')} $isOverlay>
          {sidebar}
        </Sidebar>
        <PullTab
          ref={pullTabRef}
          type="button"
          onClick={toggle}
          aria-controls={sidebarId}
          aria-expanded={isOpen}
          aria-label={pullTabLabel}
          title={pullTabLabel}
          $isOverlay
        >
          {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
        </PullTab>
      </Rail>

      {isOverlay && isOpen && <DismissArea onClick={close} aria-hidden />}

      <IndentedMain $indentPx={indentPx}>{children}</IndentedMain>
    </Container>
  )
}

/** Positioning context of the sidebar, bounded by the page content area */
const Container = styled.div`
  position: relative;
  isolation: isolate;
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
`

/**
 * Page content. Forms its own stacking context, so positioned elements inside it (such as tree legends and tree
 * buttons) stay below the sidebar and its pull tab.
 */
const Main = styled.div`
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  overflow: hidden;
`

/** Leaves room on the left for the sidebar where it takes space */
const IndentedMain = styled(Main)<{ $indentPx: number }>`
  margin-left: ${({ $indentPx }) => $indentPx}px;
`

/**
 * Sidebar together with its pull tab. Only the rail moves, and only by `transform`, which the browser animates off
 * the main thread. The page content changes width in one step after the slide, so size-dependent content (such as
 * the tree) lays out once per toggle.
 */
const Rail = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  z-index: 3;
  top: 0;
  bottom: 0;
  left: 0;
  width: ${SIDEBAR_WIDTH_PX}px;
  max-width: calc(100% - ${MIN_UNCOVERED_CONTENT_PX}px);
  transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '-100%')});
  transition: transform ${TRANSITION};
  will-change: transform;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/** Shadow of the sidebar over the page content where the sidebar covers it */
const OVERLAY_SHADOW = `2px 0 8px ${SIDEBAR_THEME.sidebarBoxShadow}`

/** Inner shadow along one edge, which makes the sidebar look recessed below the page content next to it */
function edgeShadow(x: number, y: number): string {
  const px = SIDEBAR_EDGE_SHADOW_PX
  return `${x * px}px ${y * px}px ${px}px -${px}px ${SIDEBAR_THEME.sidebarBoxShadow} inset`
}

const Sidebar = styled.aside<{ $isOverlay: boolean }>`
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: ${SIDEBAR_THEME.background};
  box-shadow: ${({ $isOverlay }) => ($isOverlay ? OVERLAY_SHADOW : edgeShadow(-1, 0))};
`

/**
 * Tab attached to the right edge of the sidebar. When the sidebar is closed, it rests on the edge of the page content.
 * It has the sidebar's colors and continues the sidebar's shadow around its outline. It starts inside the sidebar and
 * covers the sidebar's edge shadow, and its shadow is clipped on its left side, so the side that attaches to the
 * sidebar has no seam.
 */
const PullTab = styled.button<{ $isOverlay: boolean }>`
  position: absolute;
  top: 0;
  left: calc(100% - ${SIDEBAR_EDGE_SHADOW_PX}px);
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${PULL_TAB_WIDTH_PX + SIDEBAR_EDGE_SHADOW_PX}px;
  height: 44px;
  padding: 0 0 0 ${SIDEBAR_EDGE_SHADOW_PX}px;
  border: none;
  border-radius: 0 6px 6px 0;
  background-color: ${SIDEBAR_THEME.background};
  box-shadow: ${({ $isOverlay }) =>
    $isOverlay ? OVERLAY_SHADOW : [edgeShadow(-1, 0), edgeShadow(0, 1), edgeShadow(0, -1)].join(', ')};
  clip-path: inset(-12px -12px -12px 0);
  color: ${SIDEBAR_THEME.unselectedColor};
  font-size: 10px;
  cursor: pointer;

  &:hover {
    color: ${SIDEBAR_THEME.selectedColor};
  }

  &:focus-visible {
    outline: 2px solid ${SIDEBAR_THEME.selectedColor};
    outline-offset: 2px;
  }
`

/** Transparent layer over the page content under the overlaying sidebar. Catches the click that closes the sidebar */
const DismissArea = styled.div`
  position: absolute;
  z-index: 2;
  inset: 0;
`
