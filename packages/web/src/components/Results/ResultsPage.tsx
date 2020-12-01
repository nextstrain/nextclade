import React from 'react'
import { ButtonNewRun } from 'src/components/Results/ButtonNewRun'

import styled from 'styled-components'

import { LayoutResults } from 'src/components/Layout/LayoutResults'
import { GeneMapTable } from 'src/components/GeneMap/GeneMapTable'
import { SettingsButton } from 'src/components/Settings/SettingsButton'

import { ButtonBack } from './ButtonBack'
import { ButtonFilter } from './ButtonFilter'
import { ButtonExport } from './ButtonExport'
import { ButtonTree } from './ButtonTree'
import { ResultsStatus } from './ResultsStatus'
import { ResultsFilter } from './ResultsFilter'
import { ResultsTable } from './ResultsTable'
import { ButtonRerun } from './ButtonRerun'

export const Container = styled.div`
  width: 100%;
  height: 100%;
  min-width: 1000px;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
`

const Header = styled.header`
  flex-shrink: 0;
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

const HeaderRightContainer = styled.div`
  flex: 0;
`

const MainContent = styled.main`
  flex-grow: 1;
  overflow: auto;
  border: none;
`

const Footer = styled.footer`
  flex-shrink: 0;
`

export function ResultsPage() {
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
              <ButtonExport />
            </HeaderRightContainer>
            <HeaderRightContainer>
              <ButtonTree />
            </HeaderRightContainer>
            <HeaderRightContainer>
              <SettingsButton />
            </HeaderRightContainer>
          </HeaderRight>
        </Header>

        <ResultsFilter />

        <MainContent>
          <ResultsTable />
        </MainContent>

        <Footer>
          <GeneMapTable />
        </Footer>
      </Container>
    </LayoutResults>
  )
}
