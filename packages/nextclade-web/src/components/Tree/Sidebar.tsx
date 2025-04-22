import React from 'react'
import styled from 'styled-components'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import ColorBy, { ColorByInfo } from 'auspice/src/components/controls/color-by'
import ChooseBranchLabelling from 'auspice/src/components/controls/choose-branch-labelling'
import ChooseLayout from 'auspice/src/components/controls/choose-layout'
import ToggleFocus from 'auspice/src/components/controls/toggle-focus'
import ChooseMetric from 'auspice/src/components/controls/choose-metric'
import ChooseTipLabel from 'auspice/src/components/controls/choose-tip-label'
import { ControlsContainer, HeaderContainer } from 'auspice/src/components/controls/styles'
import FilterData, { FilterInfo } from 'auspice/src/components/controls/filter'
import { ToggleFocusInfo, TreeInfo } from 'auspice/src/components/controls/miscInfoText'
import { ControlHeader } from 'auspice/src/components/controls/controlHeader'
import { AnnotatedTitle } from 'auspice/src/components/controls/annotatedTitle'

import { LogoPoweredByAuspice } from 'src/components/Tree/LogoPoweredByAuspice'

export const StyledAuspiceControlsContainer = styled(ControlsContainer)``

export const SidebarHeaderStyled = styled(HeaderContainer)`
  margin-top: 0.75rem;
`

export const Bottom = styled.div`
  margin-top: auto;
  padding-top: 25px;
`

export const Spacer = styled.span<{ sizePx: number }>`
  margin-top: ${(props) => props.sizePx}px;
`

export function Sidebar() {
  const { t } = useTranslation()

  return (
    <StyledAuspiceControlsContainer>
      <ControlHeader title={t('sidebar:Color By')} tooltip={ColorByInfo} />
      <ColorBy />

      <ControlHeader title={t('sidebar:Filter Data')} tooltip={FilterInfo} />
      <FilterData measurementsOn={false} />

      <Spacer sizePx={10} />

      <TreePanel />

      <Bottom>
        <LogoPoweredByAuspice />
      </Bottom>
    </StyledAuspiceControlsContainer>
  )
}

export default Sidebar

function TreePanel() {
  const { t } = useTranslation()

  return (
    <div className="d-flex flex-column">
      <AnnotatedTitleWrapper>
        <AnnotatedTitle title={t('sidebar:Tree')} tooltip={TreeInfo} />
      </AnnotatedTitleWrapper>

      <div className="d-flex flex-column">
        <ChooseLayout />
        <ToggleFocus tooltip={ToggleFocusInfo} />
        <Spacer sizePx={10} />
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
