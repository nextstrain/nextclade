import React, { ComponentType, ReactNode, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { useSelector } from 'react-redux'
import type { AuspiceState } from 'auspice'
import { HeaderTitle } from 'src/components/Common/CardHeaderWithToggle'
import { DatasetCountBadge } from 'src/components/Main/DatasetCountBadge'
import { hasMultipleDatasetsForAnalysisAtom } from 'src/state/dataset.state'
import styled from 'styled-components'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import ColorBy, { ColorByInfo } from 'auspice/src/components/controls/color-by'
import ChooseBranchLabelling from 'auspice/src/components/controls/choose-branch-labelling'
import ChooseLayout from 'auspice/src/components/controls/choose-layout'
import { ToggleFocus } from 'auspice/src/components/controls/toggle-focus'
import { ChooseStreamTrees } from 'auspice/src/components/controls/choose-stream-trees'
import ChooseMetric from 'auspice/src/components/controls/choose-metric'
import ChooseTipLabel from 'auspice/src/components/controls/choose-tip-label'
import ChooseExplodeAttr from 'auspice/src/components/controls/choose-explode-attr'
import { PanelSection } from 'auspice/src/components/controls/panelSection'
import { ControlsContainer, HeaderContainer, TitleAndIconContainer } from 'auspice/src/components/controls/styles'
import FilterData, { FilterInfo } from 'auspice/src/components/controls/filter'
import { EntropyInfo, ExplodeTreeInfo, TreeInfo } from 'auspice/src/components/controls/miscInfoText'
import { ControlHeader } from 'auspice/src/components/controls/controlHeader'
import { AnnotatedTitle } from 'auspice/src/components/controls/annotatedTitle'
import { ViewedDatasetSelector } from 'src/components/Main/ViewedDatasetSelector'
import { LogoPoweredByAuspice } from 'src/components/Tree/LogoPoweredByAuspice'
import { SIDEBAR_THEME } from 'src/components/Layout/sidebarTheme'
import { auspiceFilterBadgeIconsCentered } from 'src/components/Tree/auspiceFilterBadgeStyle'
import { AddMetadataButton } from 'src/components/Tree/AddMetadataButton'
import { ChooseSecondTree } from 'src/components/Tree/ChooseSecondTree'
import { MapPanelSection } from 'src/components/Tree/MapPanelSection'

export const StyledAuspiceControlsContainer = styled(ControlsContainer)`
  font-family: ${SIDEBAR_THEME['font-family']};

  ${auspiceFilterBadgeIconsCentered}

  /* Auspice puts the info icon of "Explode Tree By" at the end of the row. Place it next to the title, as in the other
  titles of the sidebar */
  & [data-for='explode_tree'] {
    justify-content: flex-start;
    gap: 5px;
  }
`

export const Bottom = styled.div`
  margin-top: auto;
  padding-top: 25px;
`

export const Spacer = styled.span<{ sizePx: number }>`
  margin-top: ${(props) => props.sizePx}px;
`

/**
 * Controls below the dataset switcher:
 *  - `tree`: tree controls, which need the Redux store of the tree
 *  - `placeholder`: faint stand-ins for the tree controls, while the tree is not available yet
 *  - `none`: no controls
 */
export type SidebarControls = 'tree' | 'placeholder' | 'none'

const SIDEBAR_CONTROLS: Record<SidebarControls, ComponentType | null> = {
  tree: TreeControls,
  placeholder: TreeControlsPlaceholder,
  none: null,
}

export function Sidebar({ controls }: { controls: SidebarControls }) {
  const { t } = useTranslation()
  const hasMultipleDatasetsForAnalysis = useRecoilValue(hasMultipleDatasetsForAnalysisAtom)

  const datasetSwitcherWidget = useMemo(() => {
    if (!hasMultipleDatasetsForAnalysis) {
      return null
    }
    return (
      <>
        <span className="d-flex align-items-center">
          <span className="mr-1">
            <ControlHeaderCloneWithoutRedux title={t('Dataset')} />
          </span>
          <span className="mr-1">
            <DatasetCountBadge />
          </span>
        </span>
        <ViewedDatasetSelector />
      </>
    )
  }, [hasMultipleDatasetsForAnalysis, t])

  const Controls = SIDEBAR_CONTROLS[controls]

  return (
    <StyledAuspiceControlsContainer>
      {datasetSwitcherWidget}
      {Controls && <Controls />}
    </StyledAuspiceControlsContainer>
  )
}

function TreeControls() {
  const { t } = useTranslation()
  return (
    <>
      <ControlHeader title={t('sidebar:Color By')} tooltip={ColorByInfo} />
      <ColorBy />

      <ControlHeader title={t('sidebar:Filter Data')} tooltip={FilterInfo} />
      <FilterData measurementsOn={false} />
      <AddMetadataButton />

      <TreePanel />

      <MapPanelSection />

      <EntropyPanel />

      <Bottom>
        <LogoPoweredByAuspice />
      </Bottom>
    </>
  )
}

/** Same layout as the tree controls, without the Redux store. Hidden from assistive technology, as it has no content */
function TreeControlsPlaceholder() {
  const { t } = useTranslation()
  return (
    <>
      <div className="d-flex flex-column" aria-hidden>
        <ControlHeaderCloneWithoutRedux title={t('sidebar:Color By')} />
        <PlaceholderBar $heightPx={34} />

        <ControlHeaderCloneWithoutRedux title={t('sidebar:Filter Data')} />
        <PlaceholderBar $heightPx={34} />

        <Spacer sizePx={10} />

        <AnnotatedTitleWrapper>
          <AnnotatedTitleCloneWithoutRedux title={t('sidebar:Tree')} />
        </AnnotatedTitleWrapper>
        <PlaceholderBar $heightPx={100} />
        <PlaceholderBar $heightPx={20} />
        <PlaceholderBar $heightPx={34} />
        <PlaceholderBar $heightPx={34} />
        <PlaceholderBar $heightPx={34} />
      </div>

      <Bottom>
        <LogoPoweredByAuspice />
      </Bottom>
    </>
  )
}

// Ensures that we don't try to access redux state when there isn't one
export function ControlHeaderCloneWithoutRedux({ title }: { title: ReactNode }) {
  return (
    <HeaderContainer>
      <AnnotatedTitleCloneWithoutRedux title={title} />
    </HeaderContainer>
  )
}

// Ensures that we don't try to access redux state when there isn't one
export function AnnotatedTitleCloneWithoutRedux({ title }: { title: ReactNode }) {
  return (
    <TitleAndIconContainer>
      <HeaderTitle>{title}</HeaderTitle>
    </TitleAndIconContainer>
  )
}

function TreePanel() {
  const { t } = useTranslation()

  return (
    <div className="d-flex flex-column">
      <AnnotatedTitleWrapper>
        <AnnotatedTitle title={t('sidebar:Tree')} tooltip={TreeInfo} />
      </AnnotatedTitleWrapper>

      <div className="d-flex flex-column">
        <ChooseLayout />
        <ChooseMetric />
        <ToggleFocus />
        <ChooseStreamTrees />
        <ChooseBranchLabelling />
        <ChooseTipLabel />
        <ChooseSecondTree />
        <ChooseExplodeAttr tooltip={ExplodeTreeInfo} />
      </div>
    </div>
  )
}

/** Shows and hides the entropy chart below the tree */
function EntropyPanel() {
  const { t } = useTranslation()
  const isEntropyAvailable = useSelector((state: AuspiceState) => state.controls?.panelsAvailable?.includes('entropy'))

  if (!isEntropyAvailable) {
    return null
  }

  return <PanelSection panel="entropy" title={t('sidebar:Entropy')} tooltip={EntropyInfo} />
}

const AnnotatedTitleWrapper = styled.div`
  margin-top: 0.5rem;
  border-top: ${(props) => props.theme.gray700} solid 0.5px;
  padding-top: 1rem;
  padding-bottom: 0.5rem;
`

/** Faint stand-in for a sidebar control, pulsing to show that the content is loading */
const PlaceholderBar = styled.div<{ $heightPx: number }>`
  height: ${(props) => props.$heightPx}px;
  margin-bottom: 10px;
  border-radius: 4px;
  /* Text color at low opacity, so that the bar is visible on light and dark backgrounds */
  background-color: currentColor;
  opacity: 0.12;

  animation: sidebar-placeholder-pulse 1.5s ease-in-out infinite;
  @keyframes sidebar-placeholder-pulse {
    50% {
      opacity: 0.05;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`
