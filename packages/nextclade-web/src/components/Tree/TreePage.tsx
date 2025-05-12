import React from 'react'
import dynamic from 'next/dynamic'
import { useRecoilValue } from 'recoil'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
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
  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  return (
    <Layout>
      <Container>
        <MainContent>
          <TreePageContent key={datasetName} />
        </MainContent>
      </Container>
    </Layout>
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
