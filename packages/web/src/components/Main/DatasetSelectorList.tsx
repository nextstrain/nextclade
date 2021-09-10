import React, { useCallback, useMemo } from 'react'

import { Button, Col, Container, ListGroup, ListGroupItem, Row } from 'reactstrap'
import styled from 'styled-components'

import { formatDateIsoUtcSimple } from 'src/helpers/formatDate'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

import type { DatasetFlat } from 'src/algorithms/types'
import { search } from 'src/helpers/search'

export const DatasetSelectorContainer = styled.div`
  flex: 1 0 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;

  // prettier-ignore
  background:
    linear-gradient(#eaeaea 50%, rgba(255,255,255, 0)),
    linear-gradient(rgba(255,255,255, 0), #eaeaea 90%) 0 100%,
    radial-gradient(farthest-side at 50% 0, rgba(100,100,100, 0.5), rgba(0,0,0,0)),
    radial-gradient(farthest-side at 50% 100%, rgba(100,100,100, 0.5), rgba(0,0,0,0)) 0 100%;
  background-color: #eaeaea;
  background-repeat: no-repeat;
  background-attachment: local, local, scroll, scroll;
  background-size: 100% 70px, 100% 70px, 100% 30px, 100% 30px;
`

export const DatasetSelectorUl = styled(ListGroup)`
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 0;

  overflow-y: auto;
`

export const DatasetSelectorLi = styled(ListGroupItem)<{ $isCurrent?: boolean; $isDimmed?: boolean }>`
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  cursor: pointer;
  opacity: ${(props) => props.$isDimmed && 0.33};
`

export const DatasetSelectorLiButton = styled(Button)``

export const DatasetName = styled.p`
  font-size: 1.2rem;
  font-weight: bold;
  padding: 0;
  margin: 0;
`

export interface DatasetSelectorListItemProps {
  dataset: DatasetFlat
  isCurrent?: boolean
  isDimmed?: boolean
  onSelect?: () => void
}

export function DatasetSelectorListItem({ dataset, isCurrent, isDimmed, onSelect }: DatasetSelectorListItemProps) {
  const { t } = useTranslationSafe()

  return (
    <DatasetSelectorLi
      $isCurrent={isCurrent}
      $isDimmed={isDimmed}
      aria-current={isCurrent}
      active={isCurrent}
      onClick={onSelect}
    >
      <Container fluid className="m-0 p-0">
        <Row noGutters>
          <Col>
            <DatasetName>{dataset.nameFriendly}</DatasetName>
            <div>{dataset.description}</div>
            <div className="small">
              {t('Reference: {{ ref }} ({{ source }}: {{ accession }})', {
                ref: dataset.reference.strainName,
                source: dataset.reference.source,
                accession: dataset.reference.accession,
              })}
            </div>
          </Col>
          <Col md={2}>
            <div className="small">{formatDateIsoUtcSimple(dataset.tag)}</div>
          </Col>
        </Row>
      </Container>
    </DatasetSelectorLi>
  )
}

export interface DatasetSelectorListProps {
  datasets: DatasetFlat[]
  datasetCurrent: DatasetFlat
  searchTerm: string
  setDatasetCurrent(dataset?: DatasetFlat): void
}

export function DatasetSelectorList({
  datasets,
  datasetCurrent,
  searchTerm,
  setDatasetCurrent,
}: DatasetSelectorListProps) {
  const onSelect = useCallback((dataset: DatasetFlat) => () => setDatasetCurrent(dataset), [setDatasetCurrent])

  const { itemsStartWith, itemsInclude, itemsNotInclude } = useMemo(() => {
    if (searchTerm.trim().length === 0) {
      return { itemsStartWith: datasets, itemsInclude: [], itemsNotInclude: [] }
    }

    return search(datasets, searchTerm, (dataset) => [
      dataset.name,
      dataset.nameFriendly,
      dataset.reference.accession,
      dataset.reference.strainName,
    ])
  }, [datasets, searchTerm])

  return (
    <DatasetSelectorContainer>
      <DatasetSelectorUl>
        {[itemsStartWith, itemsInclude].map((datasets) =>
          datasets.map((dataset) => (
            <DatasetSelectorListItem
              key={dataset.name}
              dataset={dataset}
              onSelect={onSelect(dataset)}
              isCurrent={dataset.name === datasetCurrent.name}
            />
          )),
        )}

        {[itemsNotInclude].map((datasets) =>
          datasets.map((dataset) => (
            <DatasetSelectorListItem
              key={dataset.name}
              dataset={dataset}
              onSelect={onSelect(dataset)}
              isCurrent={dataset.name === datasetCurrent.name}
              isDimmed
            />
          )),
        )}
      </DatasetSelectorUl>
    </DatasetSelectorContainer>
  )
}
