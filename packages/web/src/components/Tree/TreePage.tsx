import React from 'react'

import styled from 'styled-components'
import { I18nextProvider } from 'react-i18next'
import { Button } from 'reactstrap'
import { connect } from 'react-redux'

import i18nAuspice from 'src/i18n/i18n.auspice'
import { LayoutResults } from 'src/components/Layout/LayoutResults'
import { ButtonBack } from 'src/components/Tree/ButtonBack'

import { State } from 'src/state/reducer'
import { treeFilterByClade, treeFilterByQcStatus, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'

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

const mapStateToProps = (state: State) => ({})

const mapDispatchToProps = {
  treeFilterByClade,
  treeFilterByQcStatus,
  treeFilterByNodeType,
}

export const TreePage = connect(mapStateToProps, mapDispatchToProps)(TreePageDisconnected)

function TreePageDisconnected({ treeFilterByClade, treeFilterByQcStatus, treeFilterByNodeType }: any) {
  return (
    <LayoutResults>
      <Container>
        <Header>
          <HeaderLeft>
            <ButtonBack />

            <Button type="button" onClick={() => treeFilterByClade(['19A'])}>
              19A
            </Button>

            <Button type="button" onClick={() => treeFilterByQcStatus(['Fail'])}>
              Fail
            </Button>

            <Button type="button" onClick={() => treeFilterByQcStatus(['Pass'])}>
              Pass
            </Button>

            <Button type="button" onClick={() => treeFilterByNodeType(['New'])}>
              New
            </Button>
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
        </MainContent>
      </Container>
    </LayoutResults>
  )
}

export default TreePage
