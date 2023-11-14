import React, { useEffect, useState } from 'react'
import { useRecoilState } from 'recoil'
import { Container as ContainerBase } from 'reactstrap'
import { DatasetSelectorList } from 'src/components/Main/DatasetSelectorList'
import { SuggestionPanel } from 'src/components/Main/SuggestionPanel'
import { useDatasetSuggestionResults } from 'src/hooks/useRunSeqAutodetect'
import { AutodetectRunState, autodetectRunStateAtom } from 'src/state/autodetect.state'
import styled from 'styled-components'
import type { Dataset } from 'src/types'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { SearchBox } from 'src/components/Common/SearchBox'

export interface DatasetSelectorProps {
  datasetHighlighted?: Dataset
  onDatasetHighlighted?(dataset?: Dataset): void
}

export function DatasetAutosuggestionResultsList({ datasetHighlighted, onDatasetHighlighted }: DatasetSelectorProps) {
  const [autodetectRunState, setAutodetectRunState] = useRecoilState(autodetectRunStateAtom)
  const { datasetsActive, datasetsInactive, topSuggestion, showSuggestions } = useDatasetSuggestionResults()
  useEffect(() => {
    if (autodetectRunState === AutodetectRunState.Done) {
      onDatasetHighlighted?.(topSuggestion)
      setAutodetectRunState(AutodetectRunState.Idle)
    }
  }, [autodetectRunState, onDatasetHighlighted, setAutodetectRunState, topSuggestion])

  return (
    <DatasetSelectorImpl
      datasetsActive={datasetsActive}
      datasetsInactive={datasetsInactive}
      datasetHighlighted={datasetHighlighted}
      onDatasetHighlighted={onDatasetHighlighted}
      showSuggestions={showSuggestions}
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

      <Header>
        <SuggestionPanel />
      </Header>

      <Main>
        <DatasetSelectorList
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
