import { Dataset } from '_SchemaRoot'
import { isNil } from 'lodash'
import { useRouter } from 'next/router'
import React, { useCallback, useState } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import styled from 'styled-components'
import { isDatasetPageVisitedAtom } from 'src/state/navigation.state'
import { isInSuggestModeAtom } from 'src/state/autodetect.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { Layout } from 'src/components/Layout/Layout'
import { DatasetSelector } from 'src/components/Main/DatasetSelector'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'
import { WizardNavigationBar } from 'src/components/Main/Wizard'

export function MainPage() {
  const { push, replace } = useRouter()
  const [dataset, setDataset] = useRecoilState(datasetCurrentAtom)
  const [datasetHighlighted, setDatasetHighlighted] = useState<Dataset | undefined>(dataset)
  const setIsInSuggestMode = useSetRecoilState(isInSuggestModeAtom)

  const onNext = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (datasetHighlighted?.path === 'autodetect') {
        setIsInSuggestMode(true)
        void push('/dataset-suggest') // eslint-disable-line no-void
      } else {
        setIsInSuggestMode(false)
        setDataset(datasetHighlighted)
        void push('/dataset') // eslint-disable-line no-void
      }
    }
  }, [datasetHighlighted, push, setDataset, setIsInSuggestMode])

  const isDatasetPageVisited = useRecoilValue(isDatasetPageVisitedAtom)
  if (!isDatasetPageVisited && !isNil(dataset)) {
    // Trigger Suspense (loading screen) until the routing promise is resolved
    throw replace('/dataset') // eslint-disable-line @typescript-eslint/no-throw-literal
  }

  return (
    <Layout>
      <Main>
        <Container>
          <Header>
            <MainSectionTitle />
          </Header>
          <Main>
            <DatasetSelector datasetHighlighted={datasetHighlighted} onDatasetHighlighted={setDatasetHighlighted} />
          </Main>
          <Footer>
            <WizardNavigationBar onNext={onNext} nextDisabled={!datasetHighlighted} />
          </Footer>
        </Container>
      </Main>
    </Layout>
  )
}

const Main = styled.div`
  display: flex;
  flex: 1 1 100%;
  overflow: hidden;
  padding: 0;
  margin: 0 auto;

  width: 100%;
`

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  flex: 0;
  padding-left: 10px;
  margin-top: 10px;
  margin-bottom: 3px;
`

const Footer = styled.div`
  display: flex;
  flex: 0;
`
