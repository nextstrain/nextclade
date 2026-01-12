import { isNil } from 'lodash'
import React, { useLayoutEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { Provider as ReactReduxProvider, useSelector } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { Store } from 'redux'
import { ButtonSvg } from 'src/components/Tree/ButtonSvg'
import styled, { ThemeProvider } from 'styled-components'
import type { AuspiceJsonV2, AuspiceState } from 'auspice'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import { changeColorBy } from 'auspice/src/actions/colors'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import { treeAtom } from 'src/state/results.state'
import { configureStore } from 'src/state/store'
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

export interface TreePageContentProps {
  tree?: AuspiceJsonV2
}

export default function TreePageContent({ tree: treeProp }: TreePageContentProps) {
  const { t } = useTranslationSafe()

  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const treeFromState = useRecoilValue(treeAtom(datasetName))
  const tree = treeProp ?? treeFromState

  const [store, setStore] = useState<Store<AuspiceState> | null>(null)

  useLayoutEffect(() => {
    if (!isNil(tree)) {
      const { store: newStore } = configureStore()
      const { dispatch } = newStore
      const auspiceState = createAuspiceState(tree, dispatch)
      dispatch(auspiceStartClean(auspiceState))
      dispatch(changeColorBy())
      dispatch(treeFilterByNodeType(['New']))
      setStore(newStore)
    }
  }, [tree, datasetName])

  if (isNil(tree) || isNil(store)) {
    return (
      <AuspiceContainer>
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        <I18nextProvider i18n={i18nAuspice}>
          <ThemeProvider theme={AUSPICE_SIDEBAR_THEME as never}>
            <SidebarContainer>
              <Sidebar hasTree={false} />
            </SidebarContainer>
            <TreeContainer>
              <TreeTopPanel>
                <div className="m-2">
                  <h4>{t('This dataset has no reference tree')}</h4>
                  <p className="m-0">{t('Tree-related functionality is disabled.')}</p>
                  <p className="m-0">{t('Please contact dataset authors for details.')}</p>
                </div>
              </TreeTopPanel>
            </TreeContainer>
          </ThemeProvider>
        </I18nextProvider>
      </AuspiceContainer>
    )
  }

  return (
    <AuspiceContainer>
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <I18nextProvider i18n={i18nAuspice}>
        <ThemeProvider theme={AUSPICE_SIDEBAR_THEME as never}>
          <ReactReduxProvider store={store}>
            <SidebarContainer>
              <Sidebar hasTree />
            </SidebarContainer>
            <TreeContainer>
              <TreeTopPanel>
                <FiltersSummaryWrapper>
                  <FiltersSummary />
                </FiltersSummaryWrapper>
                <GisaidLogoWidget />
                <ButtonSvg />
              </TreeTopPanel>
              <Tree />
            </TreeContainer>
          </ReactReduxProvider>
        </ThemeProvider>
      </I18nextProvider>
    </AuspiceContainer>
  )
}

function GisaidLogoWidget() {
  const isDataFromGisaid = useSelector<AuspiceState>((state) =>
    state.metadata?.dataProvenance?.some((provenance) => provenance.name?.toLowerCase() === 'gisaid'),
  )

  if (!isDataFromGisaid) {
    return null
  }

  return (
    <LogoGisaidWrapper>
      <LogoGisaid />
    </LogoGisaidWrapper>
  )
}
