import React from 'react'

import styled from 'styled-components'
import { useTranslation } from 'react-i18next'

import { LayoutResults } from 'src/components/Layout/LayoutResults'
import { ButtonBack } from 'src/components/Tree/ButtonBack'

import { Tree } from './Tree'
import { Sidebar } from './Sidebar'

const AuspiceContainer = styled.div`
  display: flex;
`

const SidebarContainer = styled.div`
  flex: 0 0 250px;
  background-color: #30353f;
`

const TreeContainer = styled.div`
  flex: 1 1;
`

export const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
`

const Header = styled.header`
  display: flex;
  flex-shrink: 0;
`

const HeaderLeft = styled.header`
  flex: 0;
`

const MainContent = styled.main`
  flex-grow: 1;
  overflow-y: scroll;
`

// const Footer = styled.footer`
//   flex-shrink: 0;
// `

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
            <SidebarContainer>
              <Sidebar />
            </SidebarContainer>
            <TreeContainer>
              <Tree />
            </TreeContainer>
          </AuspiceContainer>
        </MainContent>

        {/* <Footer></Footer> */}
      </Container>
    </LayoutResults>
  )
}

export default TreePage
