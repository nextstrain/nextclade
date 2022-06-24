import React, { HTMLProps, useCallback, useState } from 'react'

import classNames from 'classnames'
import { ThreeDots } from 'react-loader-spinner'
import { Button, Col, Container, Input, Row } from 'reactstrap'
import { useRecoilState, useRecoilValue } from 'recoil'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { datasetCurrentNameAtom, datasetsAtom } from 'src/state/dataset.state'
import styled from 'styled-components'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { DatasetSelectorList } from './DatasetSelectorList'

const DatasetSelectorContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0;
`

const DatasetSelectorTitle = styled.h4`
  flex: 1;
  margin: auto 0;
`

const DatasetSelectorListContainer = styled.section`
  display: flex;
  width: 100%;
  height: 500px;
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

export interface DatasetSelectorProps {
  searchTerm: string
  setSearchTerm(searchTerm: string): void
}

export function DatasetSelector({ searchTerm, setSearchTerm }: DatasetSelectorProps) {
  const { t } = useTranslationSafe()
  const [error, setError] = useState<string | undefined>()
  const { datasets, defaultDatasetName } = useRecoilValue(datasetsAtom)
  const [datasetCurrentName, setDatasetCurrent] = useRecoilState(datasetCurrentNameAtom)
  const [datasetHighlighted, setDatasetHighlighted] = useState<string | undefined>(
    datasetCurrentName ?? defaultDatasetName,
  )

  const onSearchTermChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setSearchTerm(value)
    },
    [setSearchTerm],
  )

  const onNextClicked = useCallback(() => {
    if (datasetHighlighted) {
      setDatasetCurrent(datasetHighlighted)
      setError(undefined)
    } else {
      setError(t('Please select a pathogen first'))
    }
  }, [datasetHighlighted, setDatasetCurrent, t])

  const isBusy = datasets.length === 0

  return (
    <DatasetSelectorContainer fluid>
      <Row noGutters>
        <Col sm={6} className="d-flex">
          <DatasetSelectorTitle>{t('Select a pathogen')}</DatasetSelectorTitle>
        </Col>

        <Col sm={6}>
          <Input
            type="text"
            title="Search pathogens"
            placeholder="Search pathogens"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-gramm="false"
            value={searchTerm}
            onChange={onSearchTermChange}
          />
        </Col>
      </Row>

      <Row noGutters className="mt-2">
        <DatasetSelectorListContainer>
          {!isBusy && (
            <DatasetSelectorList
              datasets={datasets}
              datasetHighlighted={datasetHighlighted}
              searchTerm={searchTerm}
              onDatasetHighlighted={setDatasetHighlighted}
            />
          )}

          {isBusy && (
            <SpinnerWrapper>
              <SpinnerWrapperInternal>
                <Spinner color="#aaa" width={20} height={20} />
              </SpinnerWrapperInternal>
            </SpinnerWrapper>
          )}
        </DatasetSelectorListContainer>
      </Row>

      <Row noGutters>
        <Col className="py-1">
          <LinkExternal href="https://github.com/nextstrain/nextclade_data/blob/master/CHANGELOG.md">
            <small>{t('Recent dataset updates')}</small>
          </LinkExternal>
        </Col>
      </Row>

      <Row noGutters className="mt-2">
        <Col className="d-flex">
          {error && <p className="m-0 p-0 flex-1 text-danger">{error}</p>}
          <Button
            className={classNames('ml-auto', !datasetHighlighted && 'disabled')}
            type="button"
            color={datasetHighlighted ? 'primary' : 'secondary'}
            onClick={onNextClicked}
          >
            {t('Next')}
          </Button>
        </Col>
      </Row>
    </DatasetSelectorContainer>
  )
}
