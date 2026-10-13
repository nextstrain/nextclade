import { differenceBy, isEmpty } from 'lodash'
import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { Container as ContainerBase } from 'reactstrap'
import styled from 'styled-components'
import type { Dataset } from 'src/types'
import { SelectDatasetHelp } from 'src/components/Help/SelectDatasetHelp'
import { DatasetSelectorList } from 'src/components/Main/DatasetSelectorList'
import { SuggestionAlertDatasetPage } from 'src/components/Main/SuggestionAlertDatasetPage'
import { SuggestionPanel } from 'src/components/Main/SuggestionPanel'
import { topSuggestedDatasetsAtom } from 'src/state/autodetect.state'
import { datasetsAtom, datasetSingleCurrentAtom } from 'src/state/dataset.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { SearchBox } from 'src/components/Common/SearchBox'

export function DatasetAutosuggestionResultsList() {
  const [, setCurrentDataset] = useRecoilState(datasetSingleCurrentAtom)
  const currentDataset = useRecoilValue(datasetSingleCurrentAtom)
  const topSuggestedDatasets = useRecoilValue(topSuggestedDatasetsAtom)
  const datasets = useRecoilValue(datasetsAtom)

  const { datasetsActive, datasetsInactive } = useMemo(() => {
    if (isEmpty(topSuggestedDatasets)) {
      return { datasetsActive: datasets }
    }
    const datasetsInactive = differenceBy(datasets, topSuggestedDatasets, (dataset) => dataset.path)
    return { datasetsActive: topSuggestedDatasets, datasetsInactive }
  }, [datasets, topSuggestedDatasets])

  const onDatasetHighlighted = useCallback(
    (dataset?: Dataset) => {
      setCurrentDataset(dataset)
    },
    [setCurrentDataset],
  )

  return (
    <DatasetSelectorImpl
      datasetsActive={datasetsActive}
      datasetsInactive={datasetsInactive}
      datasetHighlighted={currentDataset}
      onDatasetHighlighted={onDatasetHighlighted}
    />
  )
}

export interface DatasetSelectorImplProps {
  datasetsActive: Dataset[]
  datasetsInactive?: Dataset[]
  datasetHighlighted?: Dataset
  onDatasetHighlighted?(dataset?: Dataset): void
}

export function DatasetSelectorImpl({
  datasetsActive,
  datasetsInactive,
  datasetHighlighted,
  onDatasetHighlighted,
}: DatasetSelectorImplProps) {
  const { t } = useTranslationSafe()
  const [searchTerm, setSearchTerm] = useState('')
  return (
    <Container>
      <Header>
        <Title>
          <H4Inline>{t('Select reference dataset')}</H4Inline>
          <SelectDatasetHelp />
        </Title>

        <DatasetSearchBox
          searchTitle={t('Search datasets')}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
        />
      </Header>

      <Header>
        <div className="w-100 d-flex flex-column">
          <SuggestionPanel />
          <SuggestionAlertDatasetPage className="mt-1" />
        </div>
      </Header>

      <Main>
        <DatasetSelectorList
          datasetsActive={datasetsActive}
          datasetsInactive={datasetsInactive}
          datasetHighlighted={datasetHighlighted}
          onDatasetHighlighted={onDatasetHighlighted}
          searchTerm={searchTerm}
        />
      </Main>
    </Container>
  )
}

const Container = styled(ContainerBase)`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  margin: 0 auto;
  max-width: 800px;
`

const Header = styled.div`
  display: flex;
  flex: 0;
  padding-left: 8px;
  margin-top: 10px;
  margin-bottom: 3px;

  @media (max-width: 575.98px) {
    flex-wrap: wrap;
  }
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const Title = styled.div`
  display: flex;
  flex: 1;

  @media (max-width: 575.98px) {
    flex-basis: 100%;
    margin-bottom: 0.5rem;
  }
`

/** Takes its own row on phones, below the title */
const DatasetSearchBox = styled(SearchBox)`
  @media (max-width: 575.98px) {
    flex-basis: 100%;
  }
`

const H4Inline = styled.h4`
  display: inline-flex;
  margin: auto 0;
`
