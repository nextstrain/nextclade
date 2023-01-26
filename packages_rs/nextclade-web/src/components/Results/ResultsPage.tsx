import React, { Suspense } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'

import { resultsTableTotalWidthAtom } from 'src/state/settings.state'
import { LayoutResults } from 'src/components/Layout/LayoutResults'
import { GeneMapTable } from 'src/components/GeneMap/GeneMapTable'
import { ExportDialogButton } from 'src/components/Results/ExportDialogButton'
import { ButtonNewRun } from 'src/components/Results/ButtonNewRun'
import { ButtonBack } from './ButtonBack'
import { ButtonFilter } from './ButtonFilter'
import { ButtonTree } from './ButtonTree'
import { ResultsStatus } from './ResultsStatus'
import { ResultsFilter } from './ResultsFilter'
import { ResultsTable } from './ResultsTable'
import { ButtonRerun } from './ButtonRerun'

export const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
`

const Header = styled.header`
  flex-shrink: 1;
  display: flex;
`

const HeaderLeft = styled.header`
  flex: 0;
`

const HeaderCenter = styled.header`
  flex: 1;
  padding: 5px 10px;
  border-radius: 5px;
`

const HeaderRight = styled.header`
  flex: 0;
  display: flex;
`

const WrapperOuter = styled.div`
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
`

const WrapperInner = styled.div<{ $minWidth: number }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: ${(props) => props.$minWidth}px;
`

const HeaderRightContainer = styled.div`
  flex: 0;
`

const MainContent = styled.main`
  flex: 1;
  flex-basis: 100%;
  border: none;
`

const Footer = styled.footer`
  flex-shrink: 0;
`

export function ResultsPage() {
  const totalWidth = useRecoilValue(resultsTableTotalWidthAtom)

  return (
    <LayoutResults>
      <Container>
        <Header>
          <HeaderLeft>
            <ButtonBack />
          </HeaderLeft>
          <HeaderCenter>
            <ResultsStatus />
          </HeaderCenter>
          <HeaderRight>
            <HeaderRightContainer>
              <ButtonRerun />
            </HeaderRightContainer>
            <HeaderRightContainer>
              <ButtonNewRun />
            </HeaderRightContainer>
            <HeaderRightContainer>
              <ButtonFilter />
            </HeaderRightContainer>
            <HeaderRightContainer>
              <ExportDialogButton />
            </HeaderRightContainer>
            <HeaderRightContainer>
              <ButtonTree />
            </HeaderRightContainer>
          </HeaderRight>
        </Header>

        <WrapperOuter>
          <WrapperInner $minWidth={totalWidth}>
            <ResultsFilter />

            <MainContent>
              <ResultsTable />
            </MainContent>

            <Footer>
              <Suspense fallback={null}>
                <GeneMapTable />
              </Suspense>
            </Footer>
          </WrapperInner>
        </WrapperOuter>
      </Container>
    </LayoutResults>
  )
}
