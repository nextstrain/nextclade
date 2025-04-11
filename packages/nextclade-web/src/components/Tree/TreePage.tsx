import { AuspiceState } from 'auspice'
import { changeColorBy } from 'auspice/src/actions/colors'
import { isNil } from 'lodash'
import React, { useLayoutEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Provider as ReactReduxProvider } from 'react-redux'
import { useRecoilValue } from 'recoil'
import { Store } from 'redux'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { auspiceStartClean, treeFilterByNodeType } from 'src/state/auspice/auspice.actions'
import { createAuspiceState } from 'src/state/auspice/createAuspiceState'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import { treeAtom } from 'src/state/results.state'
import { configureStore } from 'src/state/store'
import styled from 'styled-components'
import { Layout } from 'src/components/Layout/Layout'
import { LOADING } from 'src/components/Loading/Loading'

const TreePageContent = dynamic(() => import('src/components/Tree/TreePageContent'), {
  ssr: false,
  loading() {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{LOADING}</>
  },
})

export function TreePage() {
  return (
    <Layout>
      <Container>
        <MainContent>
          <TreePageWrapper />
        </MainContent>
      </Container>
    </Layout>
  )
}

export function TreePageWrapper() {
  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const tree = useRecoilValue(treeAtom({ datasetName }))

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

  if (!store) {
    return <NoTreeContent />
  }

  return (
    <ReactReduxProvider store={store}>
      <TreePageContent key={datasetName} />
    </ReactReduxProvider>
  )
}

export function NoTreeContent() {
  const { t } = useTranslationSafe()
  return <div>{t('This dataset does not have a reference tree.')}</div>
}

const Container = styled.div`
  flex: 1;
  flex-basis: 100%;
  width: 100%;
  height: 100%;
  min-width: 1080px;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
`

const MainContent = styled.main`
  flex: 1;
  flex-basis: 100%;
  overflow-y: hidden;
`
