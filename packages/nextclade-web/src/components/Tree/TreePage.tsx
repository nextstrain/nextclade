import { AuspiceState } from 'auspice'
import { isEmpty, isNil } from 'lodash'
import React, { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { connect } from 'react-redux'
import { useRecoilValue } from 'recoil'
import { Layout } from 'src/components/Layout/Layout'
import { LOADING } from 'src/components/Loading/Loading'
import { ViewedDatasetSelector } from 'src/components/Main/ViewedDatasetSelector'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import { hasTreeAtom } from 'src/state/results.state'
import styled from 'styled-components'

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
      <TreePageWrapper />
    </Layout>
  )
}

export interface TreePageWrapperDisconnectedProps {
  hasAuspiceState: boolean
}

const mapStateToProps = (state: AuspiceState | undefined): TreePageWrapperDisconnectedProps => ({
  hasAuspiceState: !isNil(state) && !isEmpty(state),
})

const TreePageWrapper = connect(mapStateToProps)(TreePageWrapperDisconnected)

function TreePageWrapperDisconnected({ hasAuspiceState }: TreePageWrapperDisconnectedProps) {
  const { t } = useTranslationSafe()

  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const hasTree = useRecoilValue(hasTreeAtom({ datasetName }))

  const [componentsMap, setComponentsMap] = useState(new Map())

  const component = useMemo(() => {
    if (!hasTree || !hasAuspiceState) {
      return <div>{t('This dataset does not have a reference tree.')}</div>
    }

    if (componentsMap.has(datasetName)) {
      return componentsMap.get(datasetName)
    }

    const newComponent = <TreePageContent key={datasetName} />
    const newMap = new Map(componentsMap)
    newMap.set(datasetName, newComponent)
    setComponentsMap(newMap)
    return newComponent
  }, [componentsMap, datasetName, hasAuspiceState, hasTree, t])

  return (
    <Container>
      <MainContent>
        <ViewedDatasetSelector />
        {component}
      </MainContent>
    </Container>
  )
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
