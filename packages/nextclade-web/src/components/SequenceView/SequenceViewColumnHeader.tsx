import React from 'react'
import HelpTipsColumnSeqView from 'src/components/Results/HelpTips/HelpTipsColumnSeqView.mdx'
import { RefNodeSelector } from 'src/components/Results/RefNodeSelector'
import { ButtonHelpStyled } from 'src/components/Results/ResultsTableStyle'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'
import { ButtonFilter } from 'src/components/Results/ButtonFilter'
import { SequenceSelector } from 'src/components/SequenceView/SequenceSelector'

export function SequenceViewColumnHeader() {
  const { t } = useTranslationSafe()

  return (
    <FlexOuter>
      <FlexSmall>
        <ButtonFilter />
      </FlexSmall>

      <FlexLarge>
        <FlexOuter>
          <DropdownWrapper className="ml-auto">
            <span className="pb-1 px-1">{t('Genetic feature')}</span>
            <SequenceSelector />
          </DropdownWrapper>
          <DropdownWrapper className="mr-auto">
            <span className="pb-1 px-1">{t('Relative to')}</span>
            <RefNodeSelector />
          </DropdownWrapper>
        </FlexOuter>
      </FlexLarge>

      <FlexSmall className="mr-2">
        <ButtonHelpStyledLeft identifier="btn-help-col-seq-view" tooltipWidth="600px">
          <HelpTipsColumnSeqView />
        </ButtonHelpStyledLeft>
      </FlexSmall>
    </FlexOuter>
  )
}

export const ButtonHelpStyledLeft = styled(ButtonHelpStyled)`
  color: ${(props) => props.theme.gray600};
  position: unset;
  flex: 0;
`

const FlexOuter = styled.div`
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
`

const FlexLarge = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 0;
  margin: auto;
`

const DropdownWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  max-width: 300px;
  padding: 10px;
  margin: auto 0;
`

const FlexSmall = styled.div`
  display: flex;
  flex-direction: column;
  flex: 0;
  margin: auto;
  padding: 10px;
  padding-top: 27px;
`
