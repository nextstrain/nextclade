import { get, isNil, sortBy } from 'lodash'
import React, { useEffect, useMemo, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { Container as ContainerBase } from 'reactstrap'
import { DatasetSelectorListImpl } from 'src/components/Main/DatasetSelectorListImpl'
import { PROJECT_NAME } from 'src/constants'
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

// HACK: dataset entry for 'autodetect' option. This is not a real dataset.
export const DATASET_AUTODETECT: Dataset = {
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

  const datasetsActive = useMemo(() => {
    return [DATASET_AUTODETECT, ...datasets]
  }, [datasets])

  return (
    <DatasetSelectorImpl
      datasetsActive={datasetsActive}
      datasetHighlighted={datasetHighlighted}
      onDatasetHighlighted={onDatasetHighlighted}
    />
  )
}

export function DatasetAutosuggestionResultsList({ datasetHighlighted, onDatasetHighlighted }: DatasetSelectorProps) {
  const { datasets } = useRecoilValue(datasetsAtom)

  const autodetectResults = useRecoilValue(autodetectResultsAtom)
  const [autodetectRunState, setAutodetectRunState] = useRecoilState(autodetectRunStateAtom)

  const autodetectResult = useMemo(() => {
    if (isNil(autodetectResults) || autodetectResults.length === 0) {
      return undefined
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
    if (!autodetectResult) {
      return []
    }
    const { itemsStartWith, itemsInclude } = autodetectResult
    return [...itemsStartWith, ...itemsInclude]
  }, [autodetectResult])

  useEffect(() => {
    const topSuggestion = autodetectResult?.itemsInclude[0]
    if (autodetectRunState === AutodetectRunState.Done) {
      onDatasetHighlighted?.(topSuggestion)
      setAutodetectRunState(AutodetectRunState.Idle)
    }
  }, [autodetectRunState, autodetectResult?.itemsInclude, onDatasetHighlighted, setAutodetectRunState])

  if (!autodetectResults) {
    return <DatasetAutosuggestionInstructions />
  }

  return (
    <DatasetSelectorImpl
      datasetsActive={datasetsActive}
      datasetHighlighted={datasetHighlighted}
      onDatasetHighlighted={onDatasetHighlighted}
      showSuggestions
    />
  )
}

function DatasetAutosuggestionInstructions() {
  const { t } = useTranslationSafe()
  return (
    <div className="d-flex flex-column">
      <Heading>{t('Dataset autosuggestion')}</Heading>
      <Wrapper>
        <div className="flex-1 text-center">
          <p className="mx-auto">
            {t('{{projectName}} will try to guess dataset from data and will present its suggestions here.', {
              projectName: PROJECT_NAME,
            })}
          </p>
          <p className="mx-auto">{t('Please provide sequences to start.')}</p>
        </div>
      </Wrapper>
    </div>
  )
}

const Heading = styled.h4`
  padding-top: 12px;
  margin-bottom: 0;
  margin-left: 7px;
  width: 100%;
`

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  padding: 10px;
  border: 1px #ccc9 solid;
  border-radius: 5px;
  margin: 7px;
`

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
