import { isNil } from 'lodash'
import React, { HTMLProps, useCallback, useState } from 'react'
import { ThreeDots } from 'react-loader-spinner'
import { Button, Col, Container, Form, FormGroup, Input, Row } from 'reactstrap'
import { useRecoilState, useRecoilValue, useResetRecoilState } from 'recoil'
import { Toggle } from 'src/components/Common/Toggle'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRecoilToggle } from 'src/hooks/useToggle'
import { autodetectResultsAtom, hasAutodetectResultsAtom } from 'src/state/autodetect.state'
import { datasetCurrentAtom, datasetsAtom, minimizerIndexVersionAtom } from 'src/state/dataset.state'
import { shouldSuggestDatasetsAtom } from 'src/state/settings.state'
import styled from 'styled-components'
import { DatasetSelectorList } from './DatasetSelectorList'

const DatasetSelectorContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 0;
`

const DatasetSelectorTitle = styled.h4`
  flex: 1;
  margin: auto 0;
`

const DatasetSelectorListContainer = styled.section`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
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

export function DatasetSelector() {
  const { t } = useTranslationSafe()
  const [searchTerm, setSearchTerm] = useState('')
  const { datasets } = useRecoilValue(datasetsAtom)
  const [datasetCurrent, setDatasetCurrent] = useRecoilState(datasetCurrentAtom)

  const onSearchTermChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setSearchTerm(value)
    },
    [setSearchTerm],
  )

  const isBusy = datasets.length === 0

  return (
    <DatasetSelectorContainer fluid>
      <Row noGutters>
        <Col sm={6} className="d-flex">
          <DatasetSelectorTitle>{t('Select pathogen dataset')}</DatasetSelectorTitle>
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

      <Row noGutters>
        <Col>
          <AutodetectToggle />
        </Col>
      </Row>

      <Row noGutters className="mt-2 h-100 overflow-hidden">
        <Col className="h-100 overflow-hidden">
          <DatasetSelectorListContainer>
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
          </DatasetSelectorListContainer>
        </Col>
      </Row>
    </DatasetSelectorContainer>
  )
}

function AutodetectToggle() {
  const { t } = useTranslationSafe()
  const minimizerIndexVersion = useRecoilValue(minimizerIndexVersionAtom)
  const resetAutodetectResults = useResetRecoilState(autodetectResultsAtom)
  const hasAutodetectResults = useRecoilValue(hasAutodetectResultsAtom)
  const { state: shouldSuggestDatasets, toggle: toggleSuggestDatasets } = useRecoilToggle(shouldSuggestDatasetsAtom)

  if (isNil(minimizerIndexVersion)) {
    return null
  }

  return (
    <Form inline className="d-inline-flex h-100 mt-1">
      <FormGroup className="my-auto">
        <Toggle
          identifier="toggle-run-automatically"
          checked={shouldSuggestDatasets}
          onCheckedChanged={toggleSuggestDatasets}
        >
          <span
            title={t(
              'Enable suggestion of best matching pathogen datasets. Please add sequence data to launch suggestion engine.',
            )}
          >
            {t('Suggest best matches')}
          </span>
        </Toggle>

        <Button color="link" onClick={resetAutodetectResults} disabled={!hasAutodetectResults}>
          {t('Reset suggestions')}
        </Button>
      </FormGroup>
    </Form>
  )
}
