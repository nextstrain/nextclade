import React, { useCallback, useMemo } from 'react'
import { isEmpty } from 'lodash'
import { Col, Row } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { CardL1 as CardL1Base, CardL1Body as CardL1BodyBase, CardL1Header } from 'src/components/Common/Card'
import { TabMultiDatasetHelp } from 'src/components/Help/TabMultiDatasetHelp'
import { TabSingleDatasetHelp } from 'src/components/Help/TabSingleDatasetHelp'
import { SectionDatasetMulti } from 'src/components/Main/SectionDatasetMulti'
import { SectionDatasetSingle } from 'src/components/Main/SectionDatasetSingle'
import { useRecoilToggle } from 'src/hooks/useToggle'
import { datasetSingleCurrentAtom, isSingleDatasetTabActiveAtom } from 'src/state/dataset.state'
import { useQuerySeqInputs } from 'src/state/inputs.state'
import { useUpdatedDatasetIndex } from 'src/io/fetchDatasets'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'
import { QuerySequenceFilePicker } from 'src/components/Main/QuerySequenceFilePicker'
import { QuerySequenceList } from 'src/components/Main/QuerySequenceList'
import { SelectDatasetHelp } from 'src/components/Help/SelectDatasetHelp'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { TabContent, TabLabel, TabNav, TabPane } from 'src/components/Common/TabsFull'

/** Page content of natural height: the page scrolls when the content does not fit the viewport */
const Container = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 15px 1.5rem;
`

const Header = styled.div`
  display: flex;
  margin-top: 10px;
  margin-bottom: 1.5rem;

  @media (max-height: 700px) {
    margin-bottom: 1rem;
  }
`

export function Landing() {
  // This periodically fetches dataset index and updates the list of datasets.
  useUpdatedDatasetIndex()

  return (
    <Container>
      <Header>
        <MainSectionTitle />
      </Header>

      <Row>
        <Col md={6} className="d-flex flex-column mb-4 mb-md-0">
          <LandingCardQuerySeqPicker />
        </Col>

        <Col md={6} className="d-flex flex-column">
          <LandingCardDataset />
        </Col>
      </Row>
    </Container>
  )
}

export function LandingCardQuerySeqPicker() {
  const { t } = useTranslationSafe()
  const { qryInputs } = useQuerySeqInputs()

  const title = useMemo(() => {
    if (qryInputs.length > 0) {
      return t('Add more sequence data')
    }
    return t('Provide sequence data')
  }, [qryInputs.length, t])

  return (
    <CardL1 className="flex-grow-1">
      <CardL1Header>
        <CardTitle title={title}>{title}</CardTitle>
      </CardL1Header>
      <CardL1Body className="d-flex flex-column">
        <QuerySequenceFilePicker />
        <QuerySequenceList />
      </CardL1Body>
    </CardL1>
  )
}

export function LandingCardDataset() {
  const { t } = useTranslationSafe()
  const dataset = useRecoilValue(datasetSingleCurrentAtom)
  const text = useMemo(() => {
    if (isEmpty(dataset)) {
      return t('Select reference dataset')
    }
    return t('Selected reference dataset')
  }, [dataset, t])

  const { state: isSingle, setState: setIsSingle } = useRecoilToggle(isSingleDatasetTabActiveAtom)
  const activeTabId = isSingle ? 'single' : 'multi'
  const setActiveTabId = useCallback(
    (activeTabId: string) => {
      setIsSingle(activeTabId !== 'multi')
    },
    [setIsSingle],
  )

  return (
    <CardL1 className="flex-grow-1">
      <CardL1Header>
        <CardTitle>
          {text}
          <SelectDatasetHelp />
        </CardTitle>
      </CardL1Header>
      <CardL1Body className="d-flex flex-column">
        <TabNav>
          <TabLabel tabId="single" activeTabId={activeTabId} setActiveTabId={setActiveTabId}>
            {t('Single dataset')}
            <TabSingleDatasetHelp />
          </TabLabel>
          <TabLabel tabId="multi" activeTabId={activeTabId} setActiveTabId={setActiveTabId}>
            {t('Multiple datasets')}
            <TabMultiDatasetHelp />
          </TabLabel>
        </TabNav>

        <TabContent activeTab={activeTabId}>
          <TabPane tabId="single">
            <SectionDatasetSingle />
          </TabPane>
          <TabPane tabId="multi">
            <SectionDatasetMulti />
          </TabPane>
        </TabContent>
      </CardL1Body>
    </CardL1>
  )
}

const CardL1 = styled(CardL1Base)``

const CardL1Body = styled(CardL1BodyBase)``

export const CardTitle = styled.h4`
  display: inline-flex;
  flex: 1 0;
  padding-left: 0.75rem;
  margin: auto 0;
  white-space: nowrap;
  text-overflow: ellipsis;

  @media (max-width: 575.98px) {
    padding-left: 0.25rem;
    font-size: 1.25rem;
  }
`
