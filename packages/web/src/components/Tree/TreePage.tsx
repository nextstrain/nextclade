import React, { useEffect, useState } from 'react'

import styled from 'styled-components'
import type { i18n as I18N } from 'i18next'
import { I18nextProvider } from 'react-i18next'

import { DEFAULT_LOCALE_KEY } from 'src/i18n/i18n'
import { i18nAuspiceInit } from 'src/i18n/i18n.auspice'
import { LayoutResults } from 'src/components/Layout/LayoutResults'
import { ButtonBack } from 'src/components/Tree/ButtonBack'

import Loading from 'src/components/Loading/Loading'

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

export interface TreePageState {
  i18nAuspice: I18N
}

function TreePage() {
  const [state, setState] = useState<TreePageState | undefined>()

  useEffect(() => {
    i18nAuspiceInit({ localeKey: DEFAULT_LOCALE_KEY })
      .then(({ i18nAuspice }) => setState({ i18nAuspice }))
      .catch((error: Error) => {
        throw error
      })
  }, [])

  if (!state?.i18nAuspice) {
    return <Loading />
  }

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
            <I18nextProvider i18n={state.i18nAuspice}>
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
