import React, { HTMLProps, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import styled from 'styled-components'
import { ThreeDots } from 'react-loader-spinner'
import { SuggestionPanel } from 'src/components/Main/SuggestionPanel'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { datasetCurrentAtom, datasetsAtom } from 'src/state/dataset.state'
import { SearchBox } from 'src/components/Common/SearchBox'
import { DatasetSelectorList } from 'src/components/Main/DatasetSelectorList'
import { InfoButton } from 'src/components/Common/InfoButton'

export function DatasetSelector() {
  const { t } = useTranslationSafe()
  const [searchTerm, setSearchTerm] = useState('')
  const { datasets } = useRecoilValue(datasetsAtom)
  const [datasetCurrent, setDatasetCurrent] = useRecoilState(datasetCurrentAtom)

  const isBusy = datasets.length === 0

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

      <Main>
        {!isBusy && (
          <DatasetSelectorList
            datasets={datasets}
            datasetHighlighted={datasetCurrent}
            searchTerm={searchTerm}
            onDatasetHighlighted={setDatasetCurrent}
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

      <Footer>
        <SuggestionPanel />
      </Footer>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
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

const Footer = styled.div`
  display: flex;
  flex: 0;
`

const Title = styled.span`
  display: flex;
  flex: 1;
`

const H4Inline = styled.h4`
  display: inline-flex;
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
