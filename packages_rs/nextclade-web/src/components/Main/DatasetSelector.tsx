import React, { HTMLProps, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { Container as ContainerBase } from 'reactstrap'
import styled from 'styled-components'
import { ThreeDots } from 'react-loader-spinner'
import type { Dataset } from 'src/types'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { datasetsAtom } from 'src/state/dataset.state'
import { SearchBox } from 'src/components/Common/SearchBox'
import { DatasetSelectorList } from 'src/components/Main/DatasetSelectorList'

export interface DatasetSelectorProps {
  datasetHighlighted?: Dataset
  onDatasetHighlighted?(dataset?: Dataset): void
}

export function DatasetSelector({ datasetHighlighted, onDatasetHighlighted }: DatasetSelectorProps) {
  const { t } = useTranslationSafe()
  const [searchTerm, setSearchTerm] = useState('')
  const { datasets } = useRecoilValue(datasetsAtom)

  const isBusy = datasets.length === 0

  return (
    <Container>
      <Header>
        <Title>{t('Select dataset')}</Title>

        <SearchBox searchTitle={t('Search datasets')} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
      </Header>

      <Main>
        {!isBusy && (
          <DatasetSelectorList
            datasets={datasets}
            datasetHighlighted={datasetHighlighted}
            searchTerm={searchTerm}
            onDatasetHighlighted={onDatasetHighlighted}
          />
        )}

        {isBusy && (
          <SpinnerWrapper>
            <SpinnerWrapperInternal>
              <Spinner color="#aaa" width={20} height={20} />
            </SpinnerWrapperInternal>
          </SpinnerWrapper>
        )}
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

const SpinnerWrapper = styled.div<HTMLProps<HTMLDivElement>>`
  width: 100%;
  height: 100%;
  display: flex;
`

const SpinnerWrapperInternal = styled.div`
  margin: auto;
`

const Spinner = styled(ThreeDots)`
  flex: 1;
  margin: auto;
  height: 100%;
`
