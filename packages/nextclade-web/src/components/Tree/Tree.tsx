import React, { ReactNode, useLayoutEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { useSelector } from 'react-redux'
import type { AuspiceState } from 'auspice'
import { useResizeDetector } from 'react-resize-detector'
import AuspiceEntropy from 'auspice/src/components/entropy'
import AuspiceTree from 'auspice/src/components/tree'
import { PAGE_GUTTER_PX } from 'src/components/Layout/sidebarTheme'
import { useSizeBeforePaint } from 'src/hooks/useSizeBeforePaint'
import { TREE_TAB_BUTTON_GAP_PX } from 'src/components/Tree/TreeTabButton'
import { TreePanelErrorBoundary } from 'src/components/Tree/TreePanelErrorBoundary'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

/**
 * Height of the title row of an Auspice card, including its top border, if shown. Auspice places the tree legend below
 * a title row of this height. Auspice sets the card spacing with inline styles, which `AuspicePanel` overrides, so
 * the title row is the only space the card adds around the drawing.
 */
const CARD_TITLE_HEIGHT_PX = 26

/** Space between the tree header and the tree zoom buttons, which share the title row of the tree card. Matches the
 * space between the zoom buttons, so that buttons at the end of the header look like one group with them */
const HEADER_GAP_PX = TREE_TAB_BUTTON_GAP_PX

/** Space between the summary and the actions in the tree header */
const HEADER_ITEM_GAP_PX = 16

/**
 * Narrowest summary (e.g. the active filters) that the tree header keeps next to the zoom buttons. Where the space left
 * of the zoom buttons is narrower than the actions and this, the header takes its own row above the tree.
 */
const HEADER_MIN_SUMMARY_WIDTH_PX = 120

/**
 * Widest tree (e.g. on phones) whose header folds its actions (e.g. the download buttons) into one menu, so that a useful
 * part of the summary still fits next to them
 */
const HEADER_COMPACT_MAX_WIDTH_PX = 600

/**
 * Stack level of content over the tree, such as notifications: above the tree legend and the hover info, which Auspice
 * places at level 1000. The page content is its own stacking context, so the sidebar stays above
 */
export const TREE_OVERLAY_Z_INDEX = 1001

/** Space below each chart, so that its axis labels and controls stay clear of the next chart and of the page footer */
const CHART_BOTTOM_GAP_PX = 16

/**
 * Entropy chart height, as in Auspice's panel layout (`calcPanelDims()` and `computeResponsive()`): a fraction of the
 * available height minus padding, with a minimum height. Here the available height is the visible tree area.
 */
const ENTROPY_HEIGHT_FRACTION = 0.36
const ENTROPY_VERTICAL_PADDING_PX = 52
const ENTROPY_MIN_HEIGHT_PX = 300

export interface TreeProps {
  /** Start of the row above the tree, e.g. the active filters. Shrinks to fit the row */
  summary: ReactNode
  /**
   * End of the row above the tree, left of the tree zoom buttons, e.g. download buttons. Keeps its width. Compact where
   * the tree is narrow, so that the summary keeps some room
   */
  actions: (isCompact: boolean) => ReactNode
}

/**
 * Auspice tree, sized to fill the visible area, and the entropy chart below it, reachable by scrolling, if shown.
 */
export function Tree({ summary, actions }: TreeProps) {
  const { t } = useTranslationSafe()

  // Content box of the scroll container: excludes its padding and scrollbar, so the drawings fit exactly. The drawings
  // take a new size in the same frame as the container, so the tree is never painted at its old size in a moved or
  // resized container (e.g. when the sidebar opens or closes)
  const { size, ref } = useSizeBeforePaint<HTMLDivElement>()
  const width = size?.width

  // The tree zoom buttons have translated labels, so their position is measured to know the space left for the header
  const treePanelRef = useRef<HTMLDivElement>(null)
  const { width: zoomButtonsWidth, ref: zoomButtonsRef } = useResizeDetector<HTMLElement>({
    observerOptions: { box: 'border-box' },
  })
  useLayoutEffect(() => {
    // The last element in the content of the tree card holds the zoom buttons. The card is the last child of the panel
    const zoomButtons = treePanelRef.current?.querySelector<HTMLElement>(
      ':scope > div:last-child > div + div > div:last-child',
    )
    if (zoomButtons && zoomButtonsRef.current !== zoomButtons) {
      zoomButtonsRef.current = zoomButtons
    }
  })
  const [headerRight, setHeaderRight] = useState(0)
  useLayoutEffect(() => {
    const panel = treePanelRef.current
    const zoomButtons = zoomButtonsRef.current
    if (panel && zoomButtons) {
      setHeaderRight(panel.getBoundingClientRect().right - zoomButtons.getBoundingClientRect().left + HEADER_GAP_PX)
    }
  }, [width, zoomButtonsWidth, zoomButtonsRef])

  // The header shares the title row of the tree card with the zoom buttons where there is room for the actions and a
  // useful part of the summary next to them, and takes its own row above the tree card otherwise (e.g. on phones)
  const { width: actionsWidth, ref: actionsRef } = useResizeDetector<HTMLDivElement>({
    observerOptions: { box: 'border-box' },
  })
  const isHeaderStacked =
    width !== undefined && width - headerRight < (actionsWidth ?? 0) + HEADER_ITEM_GAP_PX + HEADER_MIN_SUMMARY_WIDTH_PX

  // The sidebar toggles the entropy chart through Auspice's list of displayed panels
  const showEntropy = useSelector((state: AuspiceState) => state.controls?.panelsToDisplay?.includes('entropy'))

  const visibleHeight = size?.height ?? 0
  const headerRowHeight = isHeaderStacked ? CARD_TITLE_HEIGHT_PX : 0
  const treeHeight = visibleHeight - headerRowHeight - CARD_TITLE_HEIGHT_PX - CHART_BOTTOM_GAP_PX
  const hasSize = width !== undefined && width > 0 && treeHeight > 0

  const isHeaderCompact = width !== undefined && width <= HEADER_COMPACT_MAX_WIDTH_PX

  const header = (
    <TreeHeader $isStacked={isHeaderStacked} style={isHeaderStacked ? undefined : { right: headerRight }}>
      <TreeHeaderSummary>{summary}</TreeHeaderSummary>
      <TreeHeaderActions ref={actionsRef}>{actions(isHeaderCompact)}</TreeHeaderActions>
    </TreeHeader>
  )

  return (
    <ScrollArea ref={ref}>
      {hasSize && (
        <>
          <AuspicePanel ref={treePanelRef} $hideTitle $isZoomButtonsRowOwn={isHeaderStacked}>
            {header}
            <TreePanelErrorBoundary subject={t('the tree')}>
              <AuspiceTree width={width} height={treeHeight} />
            </TreePanelErrorBoundary>
          </AuspicePanel>
          {showEntropy && (
            <AuspicePanel $noSelect>
              <TreePanelErrorBoundary subject={t('the entropy chart')}>
                <AuspiceEntropy
                  width={width}
                  height={Math.max(
                    ENTROPY_MIN_HEIGHT_PX,
                    ENTROPY_HEIGHT_FRACTION * visibleHeight - ENTROPY_VERTICAL_PADDING_PX,
                  )}
                />
              </TreePanelErrorBoundary>
            </AuspicePanel>
          )}
        </>
      )}
    </ScrollArea>
  )
}

/**
 * Scrolls the tree and the entropy chart. Fills the page content area, so the scrollbar is on the page edge. Takes its
 * size from the page layout only: without size containment, the drawings, which are sized from this element, would
 * also widen it and its ancestors through their content size.
 *
 * The space of the scrollbar is kept while there is nothing to scroll: otherwise showing the entropy chart, which adds
 * the scrollbar, would narrow the tree, and Auspice would draw the whole tree again. The scrollbar is thin, so the kept
 * space is small.
 */
const ScrollArea = styled.div`
  contain: size;
  flex: 1 1 0;
  min-height: 0;
  padding-left: ${PAGE_GUTTER_PX}px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
`

/**
 * Wrapper of an Auspice card, which is its last child, after the tree header if any. Replaces the card's margins and
 * padding, and fixes the height of its title row
 */
const AuspicePanel = styled.div<{ $hideTitle?: boolean; $isZoomButtonsRowOwn?: boolean; $noSelect?: boolean }>`
  position: relative;

  & > div:last-child {
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  & + & {
    margin-top: ${CHART_BOTTOM_GAP_PX}px;
  }

  /* Space below the last chart, so that its controls stay clear of the page footer when scrolled to the end */
  &:last-child {
    padding-bottom: ${CHART_BOTTOM_GAP_PX}px;
  }

  & > div:last-child > div:first-child {
    box-sizing: border-box;
    height: ${CARD_TITLE_HEIGHT_PX}px;
    min-height: 0 !important;
    margin: 0 !important;
    line-height: ${CARD_TITLE_HEIGHT_PX - 1}px;
    ${({ $hideTitle }) => $hideTitle && 'font-size: 0 !important; border-top: none !important;'}
  }

  /* The tree zoom buttons hang from the top line of the title row. Without that line, their top border would look
  like a piece of it. Below a stacked header row, they keep the top border, so they do not look attached to it */
  ${({ $hideTitle, $isZoomButtonsRowOwn }) =>
    $hideTitle &&
    !$isZoomButtonsRowOwn &&
    '& > div:last-child > div + div > div:last-child > button { border-top: none !important; vertical-align: top; }'}

  /* Prevent text selection when dragging over the entropy chart */
  ${({ $noSelect }) => $noSelect && 'user-select: none;'}
`

/**
 * Row above the tree. Overlays the title row of the tree card, whose title and top line are hidden, or takes a row of its
 * own above the card when stacked
 */
const TreeHeader = styled.div<{ $isStacked: boolean }>`
  ${({ $isStacked }) => ($isStacked ? 'position: relative;' : 'position: absolute; z-index: 1; top: 0; left: 0;')}
  display: flex;
  align-items: center;
  gap: ${HEADER_ITEM_GAP_PX}px;
  height: ${CARD_TITLE_HEIGHT_PX}px;
`

const TreeHeaderSummary = styled.div`
  display: flex;
  flex: 1 1 0;
  align-items: center;
  min-width: 0;
`

const TreeHeaderActions = styled.div`
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  align-self: stretch;
  gap: ${HEADER_ITEM_GAP_PX}px;
`
