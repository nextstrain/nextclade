import { get, isNil, sortBy } from 'lodash'
import React, { useEffect, useMemo, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { Container as ContainerBase } from 'reactstrap'
import { DatasetSelectorListImpl } from 'src/components/Main/DatasetSelectorListImpl'
import {
  autodetectResultsAtom,
  AutodetectRunState,
  autodetectRunStateAtom,
  groupByDatasets,
} from 'src/state/autodetect.state'
import styled from 'styled-components'
import type { Dataset } from 'src/types'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { datasetsAtom } from 'src/state/dataset.state'
import { SearchBox } from 'src/components/Common/SearchBox'

export interface DatasetSelectorProps {
  datasetHighlighted?: Dataset
  onDatasetHighlighted?(dataset?: Dataset): void
}

export function DatasetSelector({ datasetHighlighted, onDatasetHighlighted }: DatasetSelectorProps) {
  const { datasets } = useRecoilValue(datasetsAtom)

  return (
    <DatasetSelectorImpl
      datasetsActive={datasets}
      datasetHighlighted={datasetHighlighted}
      onDatasetHighlighted={onDatasetHighlighted}
    />
  )
}

export function DatasetAutosuggestionResultsList({ datasetHighlighted, onDatasetHighlighted }: DatasetSelectorProps) {
  const { datasets } = useRecoilValue(datasetsAtom)

  const autodetectResults = useRecoilValue(autodetectResultsAtom)
  const [autodetectRunState, setAutodetectRunState] = useRecoilState(autodetectRunStateAtom)

  const result = useMemo(() => {
    if (isNil(autodetectResults) || autodetectResults.length === 0) {
      return { itemsStartWith: [], itemsInclude: datasets, itemsNotInclude: [] }
    }

    const recordsByDataset = groupByDatasets(autodetectResults)

    let itemsInclude = datasets.filter((candidate) =>
      Object.entries(recordsByDataset).some(([dataset, _]) => dataset === candidate.path),
    )

    itemsInclude = sortBy(itemsInclude, (dataset) => -get(recordsByDataset, dataset.path, []).length)

    const itemsNotInclude = datasets.filter((candidate) => !itemsInclude.map((it) => it.path).includes(candidate.path))

    return { itemsStartWith: [], itemsInclude, itemsNotInclude }
  }, [autodetectResults, datasets])

  const datasetsActive = useMemo(() => {
    if (!result) {
      return []
    }
    const { itemsStartWith, itemsInclude } = result
    return [...itemsStartWith, ...itemsInclude]
  }, [result])

  const datasetsInactive = useMemo(() => {
    if (!result) {
      return []
    }
    const { itemsNotInclude } = result
    return itemsNotInclude
  }, [result])

  useEffect(() => {
    const topSuggestion = result?.itemsInclude[0]
    if (autodetectRunState === AutodetectRunState.Done) {
      onDatasetHighlighted?.(topSuggestion)
      setAutodetectRunState(AutodetectRunState.Idle)
    }
  }, [autodetectRunState, result?.itemsInclude, onDatasetHighlighted, setAutodetectRunState])

  return (
    <DatasetSelectorImpl
      datasetsActive={datasetsActive}
      datasetsInactive={datasetsInactive}
      datasetHighlighted={datasetHighlighted}
      onDatasetHighlighted={onDatasetHighlighted}
      showSuggestions
    />
  )
}

export interface DatasetSelectorImplProps {
  datasetsActive: Dataset[]
  datasetsInactive?: Dataset[]
  datasetHighlighted?: Dataset
  onDatasetHighlighted?(dataset?: Dataset): void
  showSuggestions?: boolean
}

export function DatasetSelectorImpl({
  datasetsActive,
  datasetsInactive,
  datasetHighlighted,
  onDatasetHighlighted,
  showSuggestions,
}: DatasetSelectorImplProps) {
  const { t } = useTranslationSafe()
  const [searchTerm, setSearchTerm] = useState('')
  return (
    <Container>
      <Header>
        <Title>{t('Select dataset')}</Title>

        <SearchBox searchTitle={t('Search datasets')} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
      </Header>

      <Main>
        <DatasetSelectorListImpl
          datasetsActive={datasetsActive}
          datasetsInactive={datasetsInactive}
          datasetHighlighted={datasetHighlighted}
          onDatasetHighlighted={onDatasetHighlighted}
          searchTerm={searchTerm}
          showSuggestions={showSuggestions}
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
  padding-left: 10px;
  margin-top: 10px;
  margin-bottom: 3px;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const Title = styled.h4`
  flex: 1;
  margin: auto 0;
`
