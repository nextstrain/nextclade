import React from 'react'
import styled from 'styled-components'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'

import ColorBy from 'auspice/src/components/controls/color-by'
import ChooseBranchLabelling from 'auspice/src/components/controls/choose-branch-labelling'
import ChooseLayout from 'auspice/src/components/controls/choose-layout'
import ChooseMetric from 'auspice/src/components/controls/choose-metric'
import ChooseTipLabel from 'auspice/src/components/controls/choose-tip-label'
import { HeaderContainer } from 'auspice/src/components/controls/styles'
import FilterData from 'auspice/src/components/controls/filter'

import { LogoPoweredByAuspice } from 'src/components/Tree/LogoPoweredByAuspice'

export const StyledAuspiceControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px 15px;
`

export const SidebarHeaderStyled = styled(HeaderContainer)`
  margin-top: 0.75rem;
`

export const Bottom = styled.div`
  margin-top: auto;
  padding-top: 25px;
`

export function Sidebar() {
  const { t } = useTranslation()

  return (
    <StyledAuspiceControlsContainer>
      <SidebarHeaderStyled>{t('sidebar:Color By')}</SidebarHeaderStyled>
      <ColorBy />

      <SidebarHeaderStyled>{t('sidebar:Tree Options')}</SidebarHeaderStyled>
      <ChooseLayout />
      <ChooseMetric />
      <ChooseBranchLabelling />
      <ChooseTipLabel />

      <SidebarHeaderStyled>{t('sidebar:Filter Data')}</SidebarHeaderStyled>
      <FilterData measurementsOn={false} />

      <Bottom>
        <LogoPoweredByAuspice />
      </Bottom>
    </StyledAuspiceControlsContainer>
  )
}

export default Sidebar
