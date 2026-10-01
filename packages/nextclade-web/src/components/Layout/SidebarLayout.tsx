import React, { KeyboardEvent, ReactNode, useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import styled, { css } from 'styled-components'
import { SIDEBAR_THEME, SIDEBAR_WIDTH_PX } from 'src/components/Layout/sidebarTheme'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { isSidebarOpenAtom, isWideViewportAtom } from 'src/state/sidebar.state'

const TRANSITION = '0.3s ease-out'

/** Width of the tab on the left edge of the page content that opens the closed sidebar */
const SHOW_TAB_WIDTH_PX = 14

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
  const open = useCallback(() => setIsOpen(true), [setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])
  const isOverlay = !isWide

  const sidebarRef = useRef<HTMLElement>(null)
  const hideButtonRef = useRef<HTMLButtonElement>(null)
  const showTabRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const sidebarElem = sidebarRef.current
    if (!sidebarElem) {
      return
    }
    // Keep the closed sidebar out of keyboard focus and the accessibility tree. CSS `visibility` is not enough,
    // because some controls inside (e.g. react-select inputs) set `visibility: visible` themselves.
    // React 18 has no `inert` prop, so set the DOM property directly.
    // Keyboard focus moves from the toggle control just used to the one that toggles the sidebar back. Focus can
    // enter the sidebar only after `inert` is removed, and must leave it before `inert` is set.
    const focused = document.activeElement
    if (isOpen) {
      sidebarElem.inert = false
      if (focused === showTabRef.current) {
        hideButtonRef.current?.focus({ preventScroll: true })
      }
    } else {
      if (sidebarElem.contains(focused)) {
        showTabRef.current?.focus({ preventScroll: true })
      }
      sidebarElem.inert = true
    }
  }, [isOpen])

  // Resize the page content only after the sidebar has finished sliding. Resizing re-renders size-dependent content
  // (such as the tree), which can block the main thread for a second or more and would otherwise delay painting
  // the frames of the toggle (such as the show tab appearing).
  const [isSpaceReserved, setIsSpaceReserved] = useState(isOpen)
  useLayoutEffect(() => {
    const animations = sidebarRef.current?.getAnimations() ?? []
    let isCancelled = false
    Promise.all(animations.map((animation) => animation.finished))
      .then(() => !isCancelled && setIsSpaceReserved(isOpen))
      .catch(() => undefined) // Animation was replaced by a newer toggle, which schedules its own update
    return () => {
      isCancelled = true
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

  const indentPx = !isOverlay && isSpaceReserved ? SIDEBAR_WIDTH_PX : SHOW_TAB_WIDTH_PX

  return (
    <Container>
      <Sidebar
        ref={sidebarRef}
        id={sidebarId}
        aria-label={t('Sidebar')}
        onKeyDown={handleKeyDown}
        $isOpen={isOpen}
        $isOverlay={isOverlay}
      >
        <SidebarHeader>
          <HideButton
            ref={hideButtonRef}
            type="button"
            onClick={close}
            aria-controls={sidebarId}
            aria-expanded
            aria-label={t('Hide sidebar')}
            title={t('Hide sidebar')}
          >
            <FaChevronLeft />
          </HideButton>
        </SidebarHeader>
        <SidebarBody>{sidebar}</SidebarBody>
      </Sidebar>

      {isOverlay && isOpen && <DismissArea onClick={close} aria-hidden />}

      <ShowTab
        ref={showTabRef}
        type="button"
        onClick={open}
        aria-controls={sidebarId}
        aria-expanded={false}
        aria-label={t('Show sidebar')}
        title={t('Show sidebar')}
        $isSidebarOpen={isOpen}
      >
        <FaChevronRight />
      </ShowTab>

      <IndentedMain $indentPx={indentPx}>{children}</IndentedMain>
    </Container>
  )
}

const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${SIDEBAR_THEME.selectedColor};
    outline-offset: 2px;
  }
`

const iconButton = css`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  cursor: pointer;
  color: #444;
  font-size: 12px;
  ${focusRing}
`

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
 * buttons) stay below the sidebar and its controls.
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

/** Leaves room on the left for the sidebar where it takes space, or for the tab that opens the closed sidebar */
const IndentedMain = styled(Main)<{ $indentPx: number }>`
  margin-left: ${({ $indentPx }) => $indentPx}px;
`

/**
 * Only the sidebar moves, and only by `transform`, which the browser animates off the main thread. Everything
 * attached to the sidebar (such as its hide button) is inside it and moves with it. The page content changes width
 * in one step after the slide, so size-dependent content (such as the tree) lays out once per toggle.
 */
const Sidebar = styled.aside<{ $isOpen: boolean; $isOverlay: boolean }>`
  position: absolute;
  z-index: 3;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  width: ${SIDEBAR_WIDTH_PX}px;
  max-width: calc(100% - ${MIN_UNCOVERED_CONTENT_PX}px);
  overflow: hidden;
  background-color: ${SIDEBAR_THEME.background};
  box-shadow: ${({ $isOverlay }) =>
    $isOverlay
      ? `2px 0 8px ${SIDEBAR_THEME.sidebarBoxShadow}`
      : `-3px 0 3px -3px ${SIDEBAR_THEME.sidebarBoxShadow} inset`};
  transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '-100%')});
  transition: transform ${TRANSITION};
  will-change: transform;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/** Row above the scrollable sidebar body, so the hide button never covers the body's scrollbar */
const SidebarHeader = styled.div`
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  padding: 4px 4px 0;
`

const SidebarBody = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
`

const HideButton = styled.button`
  ${iconButton}
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background-color: transparent;

  &:hover {
    background-color: rgba(0, 0, 0, 0.08);
  }
`

/** Transparent layer over the page content under the overlaying sidebar. Catches the click that closes the sidebar */
const DismissArea = styled.div`
  position: absolute;
  z-index: 2;
  inset: 0;
`

/**
 * Tab on the left edge of the page content that opens the closed sidebar. It sits under the sidebar, so the sliding
 * sidebar uncovers it when closing and covers it when opening, without animating the tab itself.
 */
const ShowTab = styled.button<{ $isSidebarOpen: boolean }>`
  ${iconButton}
  position: absolute;
  z-index: 1;
  top: 4px;
  left: 0;
  width: ${SHOW_TAB_WIDTH_PX}px;
  height: 44px;
  border-radius: 0 6px 6px 0;
  background-color: ${SIDEBAR_THEME.background};
  box-shadow: 0 0 5px 1px ${SIDEBAR_THEME.sidebarBoxShadow};

  /* Out of keyboard focus and the accessibility tree while the sidebar is open */
  visibility: ${({ $isSidebarOpen }) => ($isSidebarOpen ? 'hidden' : 'visible')};
`
