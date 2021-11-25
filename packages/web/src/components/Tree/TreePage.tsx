import { AuspiceMetadata } from 'auspice'
import React, { useMemo } from 'react'

import styled from 'styled-components'
import { I18nextProvider } from 'react-i18next'
import { connect } from 'react-redux'

import FiltersSummary from 'auspice/src/components/info/filtersSummary'

import type { State } from 'src/state/reducer'
import i18nAuspice from 'src/i18n/i18n.auspice'
import { LayoutResults } from 'src/components/Layout/LayoutResults'
import { ButtonBack } from 'src/components/Tree/ButtonBack'
import { LogoGisaid as LogoGisaidBase } from 'src/components/Common/LogoGisaid'

import { Tree } from './Tree'
import { Sidebar } from './Sidebar'

export const Container = styled.div`
  flex: 1;
  flex-basis: 100%;
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
  flex: 1;
  flex-basis: 100%;
  overflow-y: hidden;
`

const AuspiceContainer = styled.div`
  display: flex;
  flex: 1;
  flex-basis: 100%;
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

const TreeTopPanel = styled.div`
  display: flex;
`

const FiltersSummaryWrapper = styled.div`
  flex: 1 1 100%;
`

const LogoGisaidWrapper = styled.div`
  display: flex;
  flex: 0 0 auto;
  margin: 0 auto;
  margin-right: 2.25rem;
`

const LogoGisaid = styled(LogoGisaidBase)`
  margin-top: auto;
`

export interface TreePageProps {
  treeMeta?: AuspiceMetadata
}

const mapStateToProps = (state: State) => ({
  treeMeta: state.metadata,
})

export const TreePage = connect(mapStateToProps, null)(TreePageDisconnected)

function TreePageDisconnected({ treeMeta }: TreePageProps) {
  const isDataFromGisaid = useMemo(() => treeMeta?.data_provenance?.name?.toLowerCase() === 'gisaid', [treeMeta])

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
                <TreeTopPanel>
                  <FiltersSummaryWrapper>
                    <FiltersSummary />
                  </FiltersSummaryWrapper>
                  {isDataFromGisaid && (
                    <LogoGisaidWrapper>
                      <LogoGisaid />
                    </LogoGisaidWrapper>
                  )}
                </TreeTopPanel>
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
