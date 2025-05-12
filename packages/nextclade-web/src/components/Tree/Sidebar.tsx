import React, { ReactNode, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { HeaderTitle } from 'src/components/Common/CardHeaderWithToggle'
import { hasMultipleDatasetsForAnalysisAtom } from 'src/state/dataset.state'
import styled from 'styled-components'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import ColorBy, { ColorByInfo } from 'auspice/src/components/controls/color-by'
import ChooseBranchLabelling from 'auspice/src/components/controls/choose-branch-labelling'
import ChooseLayout from 'auspice/src/components/controls/choose-layout'
import ChooseMetric from 'auspice/src/components/controls/choose-metric'
import ChooseTipLabel from 'auspice/src/components/controls/choose-tip-label'
import { ControlsContainer, HeaderContainer, TitleAndIconContainer } from 'auspice/src/components/controls/styles'
import FilterData, { FilterInfo } from 'auspice/src/components/controls/filter'
import { TreeInfo } from 'auspice/src/components/controls/miscInfoText'
import { ControlHeader } from 'auspice/src/components/controls/controlHeader'
import { AnnotatedTitle } from 'auspice/src/components/controls/annotatedTitle'
import { ViewedDatasetSelector } from 'src/components/Main/ViewedDatasetSelector'
import { LogoPoweredByAuspice } from 'src/components/Tree/LogoPoweredByAuspice'

export const StyledAuspiceControlsContainer = styled(ControlsContainer)``

export const Bottom = styled.div`
  margin-top: auto;
  padding-top: 25px;
`

export const Spacer = styled.span<{ sizePx: number }>`
  margin-top: ${(props) => props.sizePx}px;
`

export function Sidebar({ hasTree }: { hasTree: boolean }) {
  // NOTE: when hasTree is false, the redux state is not available,
  // so we need to make sure downstream components don't try to access it
  const { t } = useTranslation()
  const hasMultipleDatasetsForAnalysis = useRecoilValue(hasMultipleDatasetsForAnalysisAtom)

  const { datasetSwitcherWidget, remainingWidgets } = useMemo(() => {
    let datasetSwitcherWidget = null
    if (hasMultipleDatasetsForAnalysis) {
      datasetSwitcherWidget = (
        <>
          <ControlHeaderCloneWithoutRedux title={t('Dataset')} />
          <ViewedDatasetSelector />
        </>
      )
    }

    let remainingWidgets = null
    if (hasTree) {
      remainingWidgets = (
        <>
          <ControlHeader title={t('sidebar:Color By')} tooltip={ColorByInfo} />
          <ColorBy />

          <ControlHeader title={t('sidebar:Filter Data')} tooltip={FilterInfo} />
          <FilterData measurementsOn={false} />

          <Spacer sizePx={10} />

          <TreePanel />

          <Bottom>
            <LogoPoweredByAuspice />
          </Bottom>
        </>
      )
    }

    return { datasetSwitcherWidget, remainingWidgets }
  }, [hasMultipleDatasetsForAnalysis, hasTree, t])

  return (
    <StyledAuspiceControlsContainer>
      {datasetSwitcherWidget}
      {remainingWidgets}
    </StyledAuspiceControlsContainer>
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
        <ChooseBranchLabelling />
        <Spacer sizePx={25} />
        <ChooseTipLabel />
        <Spacer sizePx={10} />
      </div>
    </div>
  )
}

const AnnotatedTitleWrapper = styled.div`
  margin-top: 0.5rem;
  border-top: ${(props) => props.theme.gray700} solid 0.5px;
  padding-top: 1rem;
  padding-bottom: 0.5rem;
`
