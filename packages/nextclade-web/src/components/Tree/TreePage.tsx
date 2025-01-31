import { isEqual } from 'lodash'
import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRecoilState, useRecoilValue } from 'recoil'
import { Layout } from 'src/components/Layout/Layout'
import { LOADING } from 'src/components/Loading/Loading'
import { ViewedDatasetSelector } from 'src/components/Main/ViewedDatasetSelector'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import { useGetAuspiceState, useSetAuspiceState } from 'src/state/reducer'
import { auspiceStateAtom } from 'src/state/results.state'
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

export default function TreePageWrapper() {
  const { t } = useTranslationSafe()

  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const [auspiceStateSaved, setAuspiceStateSaved] = useRecoilState(auspiceStateAtom({ datasetName }))

  const getAuspiceState = useGetAuspiceState()
  const setAuspiceState = useSetAuspiceState()

  const auspiceStateCurrent = getAuspiceState()

  // HACK(auspice): Remember the entire Auspice redux state in an atom, for each dataset. This way we can
  // save and load Auspice redux state when switching datasets, this way switching what Auspice is
  // rendering without recomputing it all again.
  useEffect(() => {
    if (!isEqual(auspiceStateCurrent, auspiceStateSaved)) {
      setAuspiceState(auspiceStateSaved)
    }
    return () => {
      setAuspiceStateSaved(auspiceStateCurrent)
    }
  }, [auspiceStateCurrent, auspiceStateSaved, datasetName, getAuspiceState, setAuspiceState, setAuspiceStateSaved])

  const [componentsMap, setComponentsMap] = useState(new Map())

  const component = useMemo(() => {
    if (!auspiceStateCurrent) {
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
  }, [auspiceStateCurrent, componentsMap, datasetName, t])

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
