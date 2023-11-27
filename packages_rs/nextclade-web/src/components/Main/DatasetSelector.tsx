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
        <Title>
          <H4Inline>{t('Select dataset')}</H4Inline>
          <InfoButton>
            <p>
              {t(
                'Nextclade software is built to be agnostic to pathogens it analyzes. The information about concrete pathogens is provided in the form of so-called Nextclade datasets.',
              )}
            </p>
            <p>
              {t(
                'Datasets vary by the pathogen, strain and other attributes. Each dataset is based on a particular reference sequence. Certain datasets only have enough information for basic analysis, others - more information to allow for more in-depth analysis and checks. Dataset authors periodically update and improve their datasets.',
              )}
            </p>
            <p>
              {t(
                'You can select one of the datasets manually or to use automatic dataset suggestion function. Automatic suggestion will attempt to guess the most appropriate dataset from your sequence data.',
              )}
            </p>
            <p>
              {t(
                "If you don't find a dataset for a pathogen or a strain you need, then you can create your own dataset. You can also publish it to our community collection, so that other people can use it too.",
              )}
            </p>
            <p>
              {t('Learn more about Nextclade datasets in the {{documentation}}')}
              <LinkExternal href="https://docs.nextstrain.org/projects/nextclade/en/stable/user/datasets.html">
                {t('documentation')}
              </LinkExternal>
              {t('.')}
            </p>
          </InfoButton>
        </Title>

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

const Title = styled.h4`
  flex: 1;
`

const H4Inline = styled.h4`
  display: inline-flex;
  margin: auto 0;
`
