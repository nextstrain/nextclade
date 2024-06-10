import React from 'react'
import HelpTipsColumnSeqView from 'src/components/Results/HelpTips/HelpTipsColumnSeqView.mdx'
import { RefNodeSelector } from 'src/components/Results/RefNodeSelector'
import { ButtonHelpStyled } from 'src/components/Results/ResultsTableStyle'
import styled from 'styled-components'
import { ButtonFilter } from 'src/components/Results/ButtonFilter'
import { SequenceSelector } from 'src/components/SequenceView/SequenceSelector'

export function SequenceViewColumnHeader() {
  return (
    <FlexOuter>
      <FlexSmall>
        <ButtonFilter />
      </FlexSmall>

      <FlexLarge>
        <FlexOuter>
          <FlexLarge>
            <SequenceSelector />
            <RefNodeSelector />
          </FlexLarge>
          <FlexSmall>
            <ButtonHelpStyledLeft identifier="btn-help-col-seq-view" tooltipWidth="600px">
              <HelpTipsColumnSeqView />
            </ButtonHelpStyledLeft>
          </FlexSmall>
        </FlexOuter>
      </FlexLarge>
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
`

const FlexLarge = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 0 100%;
  margin: 5px auto;
  max-width: 300px;
`

const FlexSmall = styled.div`
  display: flex;
  flex-direction: column;
  flex: 0;
  margin: auto 10px;
`
