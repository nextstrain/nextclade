import { isEmpty, isNil } from 'lodash'
import React, { useMemo } from 'react'
import styled, { ThemeProvider } from 'styled-components'
import { I18nextProvider } from 'react-i18next'
import { connect } from 'react-redux'
import { AuspiceMetadata } from 'auspice'
import { State } from 'src/state/reducer'
import i18nAuspice from 'src/i18n/i18n.auspice'
import FiltersSummary from 'auspice/src/components/info/filtersSummary'
import { SidebarContainer as SidebarContainerBase } from 'auspice/src/components/main/styles'
import { LogoGisaid as LogoGisaidBase } from 'src/components/Common/LogoGisaid'
import { Tree } from 'src/components/Tree/Tree'
import { Sidebar } from 'src/components/Tree/Sidebar'

const AuspiceContainer = styled.div`
  display: flex;
  flex: 1;
  flex-basis: 99%;
  height: 100%;
`

const SidebarContainer = styled(SidebarContainerBase)`
  position: unset !important;
  flex: 0 0 260px;
  //background-color: #30353f;
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
  padding-left: 1rem;
`

const LogoGisaidWrapper = styled.div`
  display: flex;
  flex: 0 0 auto;
  margin: 0 auto;
  margin-right: 2.25rem;
  margin-top: 10px;
`

const LogoGisaid = styled(LogoGisaidBase)`
  margin-top: auto;
`

const AUSPICE_SIDEBAR_THEME = {
  'background': '#F2F2F2',
  'color': '#000',
  'sidebarBoxShadow': 'rgba(0, 0, 0, 0.2)',
  'font-family': 'Lato, Helvetica Neue, Helvetica, sans-serif',
  'selectedColor': '#5097BA',
  'unselectedColor': '#333',
  'unselectedBackground': '#888',
}

export interface TreePageProps {
  hasTree: boolean
  treeMeta?: AuspiceMetadata
}

const mapStateToProps = (state: State | undefined) => ({
  hasTree: !isNil(state?.tree) && !isEmpty(state?.tree),
  treeMeta: state?.metadata,
})

const TreePageContent = connect(mapStateToProps)(TreePageContentDisconnected)
export default TreePageContent

function TreePageContentDisconnected({ hasTree, treeMeta }: TreePageProps) {
  const isDataFromGisaid = useMemo(
    () => treeMeta?.dataProvenance?.some((provenance) => provenance.name?.toLowerCase() === 'gisaid'),
    [treeMeta],
  )

  if (!hasTree) {
    return null
  }

  return (
    <AuspiceContainer>
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <I18nextProvider i18n={i18nAuspice}>
        <ThemeProvider theme={AUSPICE_SIDEBAR_THEME as never}>
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
        </ThemeProvider>
      </I18nextProvider>
    </AuspiceContainer>
  )
}
