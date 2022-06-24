import copy from 'fast-copy'
import React, { useCallback, useMemo } from 'react'
import { mix } from 'polished'
import styled from 'styled-components'
import { Table as TableBase, Thead, Tbody, Tr, Th, Td } from 'react-super-responsive-table'
// import 'react-super-responsive-table/dist/SuperResponsiveTableStyle.css'

import type { Dataset } from 'src/algorithms/types'
import type { Theme } from 'src/theme'
import { formatDateIsoUtcSimple } from 'src/helpers/formatDate'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { search } from 'src/helpers/search'
import { DatasetInfo, DatasetinfoContainer, DatasetInfoLine, DatasetName } from 'src/components/Main/DatasetInfo'
import { Col, ListGroup, ListGroupItem, Row } from 'reactstrap'

const DatasetSelectorTableWrapper = styled.div`
  flex: 1 0 100%;
  max-height: 300px;
  overflow-y: hidden;

  //.responsiveTable {
  //  width: 100%;
  //  max-height: 300px;
  //}

  //.responsiveTable tbody {
  //  width: 100%;
  //}

  //.responsiveTable td .tdBefore {
  //  display: none;
  //}

  //@media screen and (max-width: 40em) {
  //  .responsiveTable table,
  //  .responsiveTable thead,
  //  .responsiveTable tbody,
  //  .responsiveTable th,
  //  .responsiveTable td,
  //  .responsiveTable tr {
  //    display: block;
  //  }
  //
  //  .responsiveTable thead tr {
  //    position: absolute;
  //    top: -9999px;
  //    left: -9999px;
  //    border-bottom: 2px solid #333;
  //  }
  //
  //  .responsiveTable tbody tr {
  //    border: 1px solid #000;
  //    padding: 0.25em;
  //  }
  //
  //  .responsiveTable td.pivoted {
  //    /* Behave like a "row" */
  //    border: none !important;
  //    position: relative;
  //    //padding-left: calc(50% + 10px) !important;
  //    text-align: left !important;
  //    white-space: pre-wrap;
  //    overflow-wrap: break-word;
  //  }
  //
  //  .responsiveTable td .tdBefore {
  //    display: none;
  //
  //    ///* Now like a table header */
  //    //position: absolute;
  //    //display: block;
  //    //
  //    ///* Top/left values mimic padding */
  //    //left: 1rem;
  //    //width: calc(50% - 20px);
  //    //white-space: pre-wrap;
  //    //overflow-wrap: break-word;
  //    //text-align: left !important;
  //    //font-weight: 600;
  //  }
  //}
`

const DatasetSelectorTable = styled(TableBase)`
  //flex: 1 0 100%;
  //display: flex;
  //flex-direction: column;
  //overflow: hidden;
  //height: 100%;
  border: 1px #ccc solid;
  border-radius: 5px;
  border-collapse: collapse;

  // & > thead > tr,
  // & > tbody > tr,
  // & > tbody > td {
  //   //border: #aaa solid 1px;
  //   border-collapse: collapse;
  // }
  //
  // & > tbody > tr:nth-child(even) {
  //   //background-color: white;
  // }
  //
  // & > tbody > tr:nth-child(odd) {
  //   //background-color: #f5f5f5;
  // }
  //
  // & > thead > tr > th {
  //   //font-size: 0.9rem;
  //   //text-align: center;
  //   //height: 3rem;
  //   //border: #aaa solid 1px;
  // }
  //
  // & > tbody > tr > td {
  //   // font-family: ${(props) => props.theme.font.monospace};
  //   // font-size: 0.8rem;
  //   // text-align: left;
  //   // border: #aaa solid 1px;
  //   // min-width: 100px;
  //   // padding: 2px;
  // }

  width: 100%;
`

export const DatasetSelectorTableHeader = styled(Thead)`
  //font-weight: bold;
  // border-bottom: ${(props) => props.theme.gray400} solid 2px;
`

export const DatasetSelectorTableHeaderRow = styled(Tr)`
  //border-bottom: ${(props) => props.theme.gray400} solid 2px;
`

export const DatasetSelectorTableHeaderCol = styled(Th)`
  height: 3rem;
  border-left: ${(props) => props.theme.gray400} solid 1px;
  padding-left: 0.25rem;
`

export const DatasetSelectorTableBody = styled(Tbody)`
  //flex: 1;
  //height: 300px !important;
  //overflow-y: scroll !important;
`

export const DatasetInfoLineTitle = styled.span`
  font-weight: bold;
`

enum Parity {
  Even,
  Odd,
}

function getRowColor(theme: Theme, parity: Parity, $active?: boolean) {
  const baseColor = parity === Parity.Even ? theme.white : theme.gray200
  const addedColor = $active ? theme.primary : 'transparent'
  return mix(0.1)(baseColor)(addedColor)
}

export const DatasetSelectorTableRow = styled.tr<{ $isDimmed?: boolean; $active?: boolean }>`
  //margin: 0;
  //padding: 0.5rem;
  cursor: pointer;
  opacity: ${(props) => props.$isDimmed && 0.2};

  background-color: ${(props) => (props.$active ? props.theme.primary : 'transparent')};

  color: ${(props) => (props.$active ? props.theme.white : props.theme.bodyColor)};

  :nth-child(even) {
    background-color: ${(props) => getRowColor(props.theme, Parity.Even, props.$active)};
  }
  :nth-child(odd) {
    background-color: ${(props) => getRowColor(props.theme, Parity.Odd, props.$active)};
  }
`

export const DatasetSelectorTableCol = styled(Td)`
  //height: 3rem;
`

const Ul = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`

const Li = styled.li`
  padding: 0;
`

export interface DatasetSelectorListItemProps {
  dataset: Dataset
  isCurrent?: boolean
  isDimmed?: boolean
  onClick?: () => void
}

export function DatasetSelectorRow({ dataset, isCurrent, isDimmed, onClick }: DatasetSelectorListItemProps) {
  const { t } = useTranslationSafe()
  const tagFormatted = useMemo(() => dataset && formatDateIsoUtcSimple(dataset.attributes.tag.value), [dataset])

  const attributes = {
    ...copy(dataset.attributes),
    'Animal': {
      isDefault: false,
      value: 'unicorn',
      valueFriendly: 'Unicorn',
    },
    'Color': {
      isDefault: false,
      value: 'rainbow-stripes',
      valueFriendly: 'Rainbow stripes',
    },
    'Favourite ice cream': {
      isDefault: false,
      value: 'strawberry-banana',
      valueFriendly: 'Strawberry & banana',
    },
    'Has Magic': {
      isDefault: false,
      value: 'yes',
      valueFriendly: 'Yes',
    },
  }

  const { name, reference } = attributes

  const attrs = Object.entries(attributes)
    .filter(([key]) => !['name', 'reference', 'tag'].includes(key))
    .map(([key, val]) => (
      <Ul key={key}>
        <Li>
          <DatasetInfoLineTitle>{`${key}: `}</DatasetInfoLineTitle>
          {val.valueFriendly ?? val.value}
        </Li>
      </Ul>
    ))

  return (
    <DatasetSelectorTableRow $isDimmed={isDimmed} aria-current={isCurrent} $active={isCurrent} onClick={onClick}>
      <DatasetSelectorTableCol>
        <DatasetName>{name.valueFriendly ?? name.value}</DatasetName>
      </DatasetSelectorTableCol>
      <DatasetSelectorTableCol>
        <DatasetInfoLine>
          {t('{{ name }} ({{ accession }})', {
            name: reference.valueFriendly ?? 'Untitled',
            accession: reference.value,
          })}
        </DatasetInfoLine>
      </DatasetSelectorTableCol>
      <DatasetSelectorTableCol>{attrs}</DatasetSelectorTableCol>

      <DatasetSelectorTableCol>
        <DatasetInfoLine>{t('Updated: {{updated}}', { updated: tagFormatted })}</DatasetInfoLine>
      </DatasetSelectorTableCol>
    </DatasetSelectorTableRow>
  )
}

export interface DatasetSelectorListProps {
  datasets: Dataset[]
  searchTerm: string
  datasetHighlighted?: string
  onDatasetHighlighted(dataset: string): void
}

export function DatasetSelectorList({
  datasets,
  searchTerm,
  datasetHighlighted,
  onDatasetHighlighted,
}: DatasetSelectorListProps) {
  const { t } = useTranslationSafe()

  const onItemClick = useCallback(
    (dataset: Dataset) => () => onDatasetHighlighted(dataset.attributes.name.value),
    [onDatasetHighlighted],
  )

  const { itemsStartWith, itemsInclude, itemsNotInclude } = useMemo(() => {
    if (searchTerm.trim().length === 0) {
      return { itemsStartWith: datasets, itemsInclude: [], itemsNotInclude: [] }
    }

    return search(datasets, searchTerm, (dataset) => [
      dataset.attributes.name.value,
      dataset.attributes.name.valueFriendly ?? '',
      dataset.attributes.reference.value,
    ])
  }, [datasets, searchTerm])

  return (
    <Row noGutters>
      <Col>
        <DatasetSelectorTable>
          <DatasetSelectorTableHeader>
            <DatasetSelectorTableHeaderRow>
              <DatasetSelectorTableHeaderCol>{t('Name')}</DatasetSelectorTableHeaderCol>
              <DatasetSelectorTableHeaderCol>{t('Reference')}</DatasetSelectorTableHeaderCol>
              <DatasetSelectorTableHeaderCol>{t('Attributes')}</DatasetSelectorTableHeaderCol>
              <DatasetSelectorTableHeaderCol>{t('Last updated')}</DatasetSelectorTableHeaderCol>
            </DatasetSelectorTableHeaderRow>
          </DatasetSelectorTableHeader>

          <DatasetSelectorTableBody>
            {[itemsStartWith, itemsInclude].map((datasets) =>
              datasets.map((dataset) => (
                <DatasetSelectorRow
                  key={dataset.attributes.name.value}
                  dataset={dataset}
                  onClick={onItemClick(dataset)}
                  isCurrent={dataset.attributes.name.value === datasetHighlighted}
                />
              )),
            )}

            {[itemsNotInclude].map((datasets) =>
              datasets.map((dataset) => (
                <DatasetSelectorRow
                  key={dataset.attributes.name.value}
                  dataset={dataset}
                  onClick={onItemClick(dataset)}
                  isCurrent={dataset.attributes.name.value === datasetHighlighted}
                  isDimmed
                />
              )),
            )}
          </DatasetSelectorTableBody>
        </DatasetSelectorTable>
      </Col>
    </Row>
  )
}
