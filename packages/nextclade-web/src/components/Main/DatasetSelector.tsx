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
  const [datasetSingleCurrent, setDatasetSingleCurrent] = useRecoilState(datasetSingleCurrentAtom)
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
      setDatasetSingleCurrent(dataset)
    },
    [setDatasetSingleCurrent],
  )

  return (
    <DatasetSelectorImpl
      datasetsActive={datasetsActive}
      datasetsInactive={datasetsInactive}
      datasetHighlighted={datasetSingleCurrent}
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

        <SearchBox searchTitle={t('Search datasets')} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
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
`

const H4Inline = styled.h4`
  display: inline-flex;
  margin: auto 0;
`
