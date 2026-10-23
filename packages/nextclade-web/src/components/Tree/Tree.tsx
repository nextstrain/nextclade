import React, { ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { useSelector } from 'react-redux'
import type { AuspiceState } from 'auspice'
import { useResizeDetector } from 'react-resize-detector'
import AuspiceEntropy from 'auspice/src/components/entropy'
import AuspiceTree from 'auspice/src/components/tree'
import { calcPanelDims } from 'auspice/src/components/main/utils'
import { numberOfGridPanels } from 'auspice/src/actions/panelDisplay'
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

/**
 * Height of the title row of the tree card while two trees are shown: Auspice writes the names of the trees 25 px below
 * the top of the card, in a 16 px font, so the row holds them above the trees
 */
const CARD_TITLE_HEIGHT_TWO_TREES_PX = 46

/**
 * Auspice map, loaded when shown: Leaflet needs a browser window when it loads, and the map code is large and needed
 * only for users who add metadata with coordinates
 */
const AuspiceMap = dynamic(() => import('auspice/src/components/map/map'), { ssr: false })

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

/**
 * Space between panels, and below the last one, so that their axis labels and controls stay clear of the next panel and
 * of the page footer
 */
const PANEL_GAP_PX = 16

const NO_PANELS: string[] = []

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
 * Auspice tree, and the map and the entropy chart if shown, laid out and sized as in Auspice's panel layout
 * (`calcPanelDims()` in `src/components/main/utils.js`), with the visible area of the page as the available area.
 * In the full layout the panels are stacked. In the grid layout the tree and the map are side by side, above the entropy
 * chart. Panels below the visible area are reached by scrolling.
 */
export function Tree({ summary, actions }: TreeProps) {
  const { t } = useTranslationSafe()

  // Content box of the scroll container: excludes its padding and scrollbar, so the drawings fit exactly. The drawings
  // take a new size in the same frame as the container, so the tree is never painted at its old size in a moved or
  // resized container (e.g. when the sidebar opens or closes)
  const { size, ref } = useSizeBeforePaint<HTMLDivElement>()
  const width = size?.width
  const visibleHeight = size?.height ?? 0

  // The sidebar toggles the entropy chart and the map through Auspice's list of displayed panels, and switches the
  // layout. Auspice shows no map next to a second tree
  const panelsToDisplay = useSelector((state: AuspiceState) => state.controls?.panelsToDisplay) ?? NO_PANELS
  const panelLayout = useSelector((state: AuspiceState) => state.controls?.panelLayout)
  const hasTwoTrees = useSelector((state: AuspiceState) => !!state.controls?.showTreeToo)
  const showEntropy = panelsToDisplay.includes('entropy')
  const showMap = panelsToDisplay.includes('map') && !hasTwoTrees

  // The map takes part in the grid only for an even number of grid panels, as in Auspice's `shouldMapBeInGrid()`, and
  // shows the colors of the coloring in its legend only outside of the grid, where the tree legend is not next to it
  const { full, grid, chartEntropy } = useMemo(
    () => calcPanelDims(panelsToDisplay, false, width ?? 0, visibleHeight),
    [panelsToDisplay, visibleHeight, width],
  )
  const isTreeInGrid = panelLayout === 'grid'
  const isMapInGrid = isTreeInGrid && numberOfGridPanels(panelsToDisplay) % 2 === 0
  const treeDims = isTreeInGrid ? grid : full
  const mapDims = isMapInGrid ? grid : full
  const mapLegend = useMemo(() => ({ swatches: !isMapInGrid, demes: true }), [isMapInGrid])

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
  }, [treeDims.width, zoomButtonsWidth, zoomButtonsRef])

  // The header shares the title row of the tree card with the zoom buttons where there is room for the actions and a
  // useful part of the summary next to them, and takes its own row above the tree card otherwise (e.g. on phones)
  const { width: actionsWidth, ref: actionsRef } = useResizeDetector<HTMLDivElement>({
    observerOptions: { box: 'border-box' },
  })

  // Two trees have a group of zoom buttons each, and the names of the trees in the title row, so the header takes its
  // own row then
  const isHeaderStacked =
    hasTwoTrees || treeDims.width - headerRight < (actionsWidth ?? 0) + HEADER_ITEM_GAP_PX + HEADER_MIN_SUMMARY_WIDTH_PX
  const isHeaderCompact = treeDims.width <= HEADER_COMPACT_MAX_WIDTH_PX

  // The title rows of the cards are inside the panel sizes, and so is the header row above the tree where it stacks
  const headerRowHeight = isHeaderStacked ? CARD_TITLE_HEIGHT_PX : 0
  const treeTitleHeight = hasTwoTrees ? CARD_TITLE_HEIGHT_TWO_TREES_PX : CARD_TITLE_HEIGHT_PX
  const treeHeight = treeDims.height - headerRowHeight - treeTitleHeight
  const mapHeight = mapDims.height - CARD_TITLE_HEIGHT_PX
  const hasSize = width !== undefined && width > 0 && treeHeight > 0

  const treePanelStyle = useMemo(() => ({ width: treeDims.width }), [treeDims.width])
  const mapPanelStyle = useMemo(() => ({ width: mapDims.width }), [mapDims.width])
  const entropyPanelStyle = useMemo(() => ({ width: chartEntropy.width }), [chartEntropy.width])
  const headerStyle = useMemo(
    () => (isHeaderStacked ? undefined : { right: headerRight }),
    [headerRight, isHeaderStacked],
  )

  const header = (
    <TreeHeader $isStacked={isHeaderStacked} style={headerStyle}>
      <TreeHeaderSummary>{summary}</TreeHeaderSummary>
      <TreeHeaderActions ref={actionsRef}>{actions(isHeaderCompact)}</TreeHeaderActions>
    </TreeHeader>
  )

  return (
    <ScrollArea ref={ref}>
      {hasSize && (
        <Panels>
          <GridPanels $isRow={showMap && isMapInGrid}>
            <AuspicePanel
              ref={treePanelRef}
              style={treePanelStyle}
              $hideTitle
              $titleHeightPx={treeTitleHeight}
              $isZoomButtonsRowOwn={isHeaderStacked}
            >
              {header}
              <TreePanelErrorBoundary subject={t('the tree')}>
                <AuspiceTree width={treeDims.width} height={treeHeight} />
              </TreePanelErrorBoundary>
            </AuspicePanel>
            {showMap && (
              <AuspicePanel style={mapPanelStyle}>
                <TreePanelErrorBoundary subject={t('the map')}>
                  <AuspiceMap
                    width={mapDims.width}
                    height={mapHeight}
                    justGotNewDatasetRenderNewMap={false}
                    legend={mapLegend}
                  />
                </TreePanelErrorBoundary>
              </AuspicePanel>
            )}
          </GridPanels>
          {showEntropy && (
            <AuspicePanel style={entropyPanelStyle} $noSelect>
              <TreePanelErrorBoundary subject={t('the entropy chart')}>
                <AuspiceEntropy width={chartEntropy.width} height={chartEntropy.height} />
              </TreePanelErrorBoundary>
            </AuspicePanel>
          )}
        </Panels>
      )}
    </ScrollArea>
  )
}

/**
 * Scrolls the panels. Fills the page content area, so the scrollbar is on the page edge. Takes its size from the page
 * layout only: without size containment, the drawings, which are sized from this element, would also widen it and its
 * ancestors through their content size.
 *
 * The space of the scrollbar is kept while there is nothing to scroll: otherwise a panel that adds the scrollbar would
 * narrow the tree, and Auspice would draw the whole tree again. The scrollbar is thin, so the kept space is small.
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
 * Panels in a column, with space below the last one, so that its controls stay clear of the page footer when scrolled
 * to the end
 */
const Panels = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${PANEL_GAP_PX}px;
  padding-bottom: ${PANEL_GAP_PX}px;
`

/** Tree and map: side by side in the grid layout, stacked otherwise */
const GridPanels = styled.div<{ $isRow: boolean }>`
  display: flex;
  flex-direction: ${({ $isRow }) => ($isRow ? 'row' : 'column')};
  align-items: flex-start;
  gap: ${PANEL_GAP_PX}px;
`

/**
 * Wrapper of an Auspice card, which is its last child, after the tree header if any. Takes the width of the panel,
 * replaces the card's margins and padding, and fixes the height of its title row
 */
const AuspicePanel = styled.div<{
  $hideTitle?: boolean
  $titleHeightPx?: number
  $isZoomButtonsRowOwn?: boolean
  $noSelect?: boolean
}>`
  position: relative;

  & > div:last-child {
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  & > div:last-child > div:first-child {
    box-sizing: border-box;
    height: ${({ $titleHeightPx = CARD_TITLE_HEIGHT_PX }) => $titleHeightPx}px;
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
