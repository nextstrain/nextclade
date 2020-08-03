import React from 'react'

import styled from 'styled-components'
import { I18nextProvider } from 'react-i18next'

import i18nAuspice from 'src/i18n/i18n.auspice'
import { LayoutResults } from 'src/components/Layout/LayoutResults'
import { ButtonBack } from 'src/components/Tree/ButtonBack'

import Footer from 'auspice/src/components/framework/footer'

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

const MainContent = styled.main`
  flex-grow: 1;
  height: 100%;
  overflow-y: auto;
`

const AuspiceContainer = styled.div`
  display: flex;
  height: 100%;
  min-height: 750px;
`

const SidebarContainer = styled.div`
  flex: 0 0 250px;
  background-color: #30353f;
`

const TreeContainer = styled.div`
  flex: 1 1;
  overflow: hidden; // prevent infinite loop: show scroll, shrink, hide scroll, expand, show scroll...
`

function TreePage() {
  return (
    <LayoutResults>
      <Container>
        <Header>
          <HeaderLeft>
            <ButtonBack />
          </HeaderLeft>
        </Header>
        <MainContent>
          <AuspiceContainer>
            <I18nextProvider i18n={i18nAuspice}>
              <SidebarContainer>
                <Sidebar />
              </SidebarContainer>
              <TreeContainer>
                <Tree />
              </TreeContainer>
            </I18nextProvider>
          </AuspiceContainer>
          <I18nextProvider i18n={i18nAuspice}>
            <Footer width={800} />
          </I18nextProvider>
        </MainContent>
      </Container>
    </LayoutResults>
  )
}

export default TreePage
