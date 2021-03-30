import React from 'react'

import styled from 'styled-components'
import { I18nextProvider } from 'react-i18next'

import FiltersSummary from 'auspice/src/components/info/filtersSummary'

import i18nAuspice from 'src/i18n/i18n.auspice'
import { LayoutResults } from 'src/components/Layout/LayoutResults'
import { ButtonBack } from 'src/components/Tree/ButtonBack'

import { Tree } from './Tree'
import { Sidebar } from './Sidebar'

export const Container = styled.div`
  width: 100%;
  height: 100%;
  min-width: 1000px;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
`

const Header = styled.header`
  display: flex;
  flex-shrink: 0;
  margin-bottom: 7px;
`

const HeaderLeft = styled.header`
  flex: 0;
`

const HeaderCenter = styled.header`
  flex: 1;
  padding: 5px 10px;
  border-radius: 5px;
`

const MainContent = styled.main`
  flex-grow: 1;
  overflow-y: hidden;
`

const AuspiceContainer = styled.div`
  display: flex;
  height: 100%;
`

const SidebarContainer = styled.div`
  flex: 0 0 260px;
  background-color: #30353f;
  overflow-y: auto;
`

const TreeContainer = styled.div`
  flex: 1 1;
  overflow-y: scroll;
`

function TreePage() {
  return (
    <LayoutResults>
      <Container>
        <Header>
          <HeaderLeft>
            <ButtonBack />
          </HeaderLeft>

          <HeaderCenter />
        </Header>

        <MainContent>
          <AuspiceContainer>
            <I18nextProvider i18n={i18nAuspice}>
              <SidebarContainer>
                <Sidebar />
              </SidebarContainer>
              <TreeContainer>
                <span>
                  <FiltersSummary />
                </span>

                <Tree />
              </TreeContainer>
            </I18nextProvider>
          </AuspiceContainer>
        </MainContent>
      </Container>
    </LayoutResults>
  )
}

export default TreePage
