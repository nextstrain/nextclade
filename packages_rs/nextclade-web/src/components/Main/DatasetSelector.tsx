import { get, isNil, sortBy } from 'lodash'
import React, { useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { Container as ContainerBase } from 'reactstrap'
import { DatasetSelectorListImpl } from 'src/components/Main/DatasetSelectorListImpl'
import { autodetectResultsAtom, groupByDatasets } from 'src/state/autodetect.state'
import styled from 'styled-components'
import type { Dataset } from 'src/types'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { datasetsAtom } from 'src/state/dataset.state'
import { SearchBox } from 'src/components/Common/SearchBox'

// HACK: dataset entry for 'autodetect' option. This is not a real dataset.
const DATASET_AUTODETECT: Dataset = {
  path: 'autodetect',
  enabled: true,
  official: true,
  attributes: {
    name: { value: 'autodetect', valueFriendly: 'Autodetect' },
    reference: { value: 'autodetect', valueFriendly: 'Autodetect' },
  },
  files: {
    reference: '',
    pathogenJson: '',
  },
}

export interface DatasetSelectorProps {
  datasetHighlighted?: Dataset
  onDatasetHighlighted?(dataset?: Dataset): void
}

export function DatasetSelector({ datasetHighlighted, onDatasetHighlighted }: DatasetSelectorProps) {
  const { datasets } = useRecoilValue(datasetsAtom)

  const autodetectResults = useRecoilValue(autodetectResultsAtom)

  const autodetectResult = useMemo(() => {
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

  const { itemsStartWith, itemsInclude, itemsNotInclude } = autodetectResult

  const datasetsActive = useMemo(() => {
    return [DATASET_AUTODETECT, ...itemsStartWith, ...itemsInclude]
  }, [itemsInclude, itemsStartWith])

  const datasetsInactive = useMemo(() => {
    return [...itemsNotInclude]
  }, [itemsNotInclude])

  return (
    <DatasetSelectorImpl
      datasetsActive={datasetsActive}
      datasetsInactive={datasetsInactive}
      datasetHighlighted={datasetHighlighted}
      onDatasetHighlighted={onDatasetHighlighted}
    />
  )
}

export interface DatasetSelectorImplProps {
  datasetsActive: Dataset[]
  datasetsInactive: Dataset[]
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
  margin-right: 10px;
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

// const Footer = styled.div`
//   display: flex;
//   flex: 0;
// `

const Title = styled.h4`
  flex: 1;
  margin: auto 0;
`
