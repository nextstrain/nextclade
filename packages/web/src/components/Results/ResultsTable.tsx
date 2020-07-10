import React, { memo } from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FixedSizeList, areEqual, ListChildComponentProps } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import styled from 'styled-components'
import { rgba } from 'polished'

import { State } from 'src/state/reducer'
import { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'
import { sortByNameAsc, sortByNameDesc } from 'src/state/algorithm/algorithm.actions'

import { ColumnName } from 'src/components/Results/ColumnName'
import { ColumnQCStatus } from 'src/components/Results/ColumnQCStatus'
import { ColumnClade } from 'src/components/Results/ColumnClade'
import { ColumnMutations } from 'src/components/Results/ColumnMutations'
import { ColumnNonACGTNs } from 'src/components/Results/ColumnNonACGTNs'
import { ColumnMissing } from 'src/components/Results/ColumnMissing'
import { ColumnGaps } from 'src/components/Results/ColumnGaps'
import { SequenceView } from 'src/components/SequenceView/SequenceView'
import { SortAndFilterControls } from './SortAndFilterControls'
import { ResultsFilterControls } from './ResultsFilterControls'

const ROW_HEIGHT = 30
const HEADER_ROW_HEIGHT = 60

export const Table = styled.div`
  font-size: 0.8rem;
  width: 100%;
  height: 100%;
  background-color: #b3b3b3aa;
`

export const TableHeaderRow = styled.div`
  display: flex;
  align-items: stretch;
  height: ${HEADER_ROW_HEIGHT}px;
  overflow-y: scroll;
  background-color: #4c4c4c;
  color: #bcbbbb;
`

export const TableHeaderCell = styled.div<{ basis?: string; grow?: number; shrink?: number }>`
  flex-basis: ${(props) => props?.basis};
  flex-grow: ${(props) => props?.grow};
  flex-shrink: ${(props) => props?.shrink};
  overflow: hidden;
  border-left: 1px solid #b3b3b3;
  width: 100%;
  height: 100%;
  display: flex;
`

export const TableCellText = styled.p`
  text-align: center;
  margin: auto;
`

export const TableRow = styled.div<{ even?: boolean }>`
  display: flex;
  align-items: stretch;
  background-color: ${(props) => (props.even ? '#e2e2e2' : '#fcfcfc')};
  box-shadow: 1px 2px 2px 2px ${rgba('#212529', 0.25)};
`

export const TableCell = styled.div<{ basis?: string; grow?: number; shrink?: number }>`
  flex-basis: ${(props) => props?.basis};
  flex-grow: ${(props) => props?.grow};
  flex-shrink: ${(props) => props?.shrink};
  overflow: hidden;
  display: flex;
  align-items: center;
  text-align: center;
  border-left: 1px solid #b3b3b3;
  height: 100%;
`

export const TableCellName = styled(TableCell)<{ basis?: string; grow?: number; shrink?: number }>`
  text-align: left;
  padding-left: 5px;
`

export const TableRowPending = styled(TableRow)`
  background-color: #d2d2d2;
  color: #818181;
`

export const TableRowError = styled(TableRow)`
  background-color: #f5cbc6;
  color: #962d26;
`

export interface RowProps extends ListChildComponentProps {
  data: SequenceAnylysisState[]
}

function TableRowComponent({ index, style, data }: RowProps) {
  const { t } = useTranslation()

  const { id, seqName, errors, result: sequence } = data[index]

  if (errors.length > 0) {
    return (
      <TableRowError style={style} even={index % 2 === 0}>
        <TableCell basis="50px" grow={0} shrink={0}>
          <TableCellText>{id}</TableCellText>
        </TableCell>
        <TableCellName basis="250px" shrink={0}>
          <ColumnName seqName={seqName} sequence={sequence} />
        </TableCellName>
        <TableCell grow={20} shrink={20}>
          <TableCellText>{errors}</TableCellText>
        </TableCell>
      </TableRowError>
    )
  }

  if (!sequence) {
    return (
      <TableRowPending style={style} even={index % 2 === 0}>
        <TableCell basis="50px" grow={0} shrink={0}>
          <TableCellText>{id}</TableCellText>
        </TableCell>
        <TableCellName basis="250px" shrink={0}>
          <ColumnName seqName={seqName} sequence={sequence} />
        </TableCellName>
        <TableCell grow={20} shrink={20}>
          <TableCellText>{t('Analyzing...')}</TableCellText>
        </TableCell>
      </TableRowPending>
    )
  }

  return (
    <TableRow style={style} even={index % 2 === 0}>
      <TableCell basis="50px" grow={0} shrink={0}>
        <TableCellText>{id}</TableCellText>
      </TableCell>

      <TableCellName basis="250px" shrink={0}>
        <ColumnName seqName={seqName} sequence={sequence} />
      </TableCellName>

      <TableCell basis="50px" grow={0} shrink={0}>
        <ColumnQCStatus sequence={sequence} />
      </TableCell>

      <TableCell basis="50px" grow={0} shrink={0}>
        <ColumnClade sequence={sequence} />
      </TableCell>

      <TableCell basis="50px" grow={0} shrink={0}>
        <ColumnMutations sequence={sequence} />
      </TableCell>

      <TableCell basis="50px" grow={0} shrink={0}>
        <ColumnNonACGTNs sequence={sequence} />
      </TableCell>

      <TableCell basis="50px" grow={0} shrink={0}>
        <ColumnMissing sequence={sequence} />
      </TableCell>

      <TableCell basis="50px" grow={0} shrink={0}>
        <ColumnGaps sequence={sequence} />
      </TableCell>

      <TableCell grow={20} shrink={20}>
        <SequenceView key={seqName} sequence={sequence} />
      </TableCell>
    </TableRow>
  )
}

const TableRowMemo = memo(TableRowComponent, areEqual)

const mapStateToProps = (state: State) => ({
  resultsFiltered: state.algorithm.resultsFiltered,
})

const mapDispatchToProps = {
  sortByNameAsc: () => sortByNameAsc(),
  sortByNameDesc: () => sortByNameDesc(),
}

export const ResultsTable = connect(mapStateToProps, mapDispatchToProps)(ResultsTableDisconnected)

export interface ResultProps {
  resultsFiltered: SequenceAnylysisState[]
  sortByNameAsc(): void
  sortByNameDesc(): void
}

export function ResultsTableDisconnected({ resultsFiltered, sortByNameAsc, sortByNameDesc }: ResultProps) {
  const { t } = useTranslation()

  const data = resultsFiltered

  return (
    <>
      <Table>
        <TableHeaderRow>
          <TableHeaderCell basis="50px" grow={0} shrink={0}>
            <TableCellText>{t('ID')}</TableCellText>
          </TableHeaderCell>
          <TableHeaderCell basis="250px" shrink={0}>
            <ResultsFilterControls />
            <TableCellText>{t('Sequence name')}</TableCellText>
            <SortAndFilterControls sortAsc={sortByNameAsc} sortDesc={sortByNameDesc} />
          </TableHeaderCell>

          <TableHeaderCell basis="50px" grow={0} shrink={0}>
            <TableCellText>{t('QC')}</TableCellText>
          </TableHeaderCell>
          <TableHeaderCell basis="50px" grow={0} shrink={0}>
            <TableCellText>{t('Clade')}</TableCellText>
          </TableHeaderCell>
          <TableHeaderCell basis="50px" grow={0} shrink={0}>
            <TableCellText>{t('Mut.')}</TableCellText>
          </TableHeaderCell>
          <TableHeaderCell basis="50px" grow={0} shrink={0}>
            <TableCellText>{t('non-ACGTN')}</TableCellText>
          </TableHeaderCell>
          <TableHeaderCell basis="50px" grow={0} shrink={0}>
            <TableCellText>{t('Ns')}</TableCellText>
          </TableHeaderCell>
          <TableHeaderCell basis="50px" grow={0} shrink={0}>
            <TableCellText>{t('Gaps')}</TableCellText>
          </TableHeaderCell>
          <TableHeaderCell grow={20}>
            <TableCellText>{t('Sequence')}</TableCellText>
          </TableHeaderCell>
        </TableHeaderRow>

        <AutoSizer>
          {({ width, height }) => {
            return (
              <FixedSizeList
                overscanCount={10}
                style={{ overflowY: 'scroll' }}
                width={width}
                height={height - HEADER_ROW_HEIGHT}
                itemCount={data.length}
                itemSize={ROW_HEIGHT}
                itemData={data}
              >
                {TableRowMemo}
              </FixedSizeList>
            )
          }}
        </AutoSizer>
      </Table>
    </>
  )
}
