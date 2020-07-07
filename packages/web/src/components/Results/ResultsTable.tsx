import React, { HTMLProps, memo, PropsWithChildren, ReactPropTypes } from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FixedSizeList, areEqual, ListChildComponentProps } from 'react-window'
import memoize from 'memoize-one'
import AutoSizer from 'react-virtualized-auto-sizer'
import ReactResizeDetector from 'react-resize-detector'
import classNames from 'classnames'
import styled from 'styled-components'

import { ButtonBack } from 'src/components/Results/ButtonBack'
import { ButtonExport } from 'src/components/Results/ButtonExport'
import { ColumnName } from 'src/components/Results/ColumnName'
import { ColumnQCStatus } from 'src/components/Results/ColumnQCStatus'
import { ColumnClade } from 'src/components/Results/ColumnClade'
import { ColumnMutations } from 'src/components/Results/ColumnMutations'
import { ColumnNonACGTNs } from 'src/components/Results/ColumnNonACGTNs'
import { ColumnMissing } from 'src/components/Results/ColumnMissing'
import { ColumnGaps } from 'src/components/Results/ColumnGaps'
import { SequenceView } from 'src/components/SequenceView/SequenceView'
import { range } from 'lodash'

const ROW_HEIGHT = 30
const HEADER_ROW_HEIGHT = 50

const Table = styled.div`
  font-size: 0.8rem;
  width: 100%;
  height: 100%;
  min-width: 740px;
`

const TableHeaderRow = styled.div`
  display: flex;
  align-items: stretch;
  height: ${HEADER_ROW_HEIGHT}px;
  overflow-y: scroll;
  background-color: #4c4c4c;
  color: #bcbbbb;
`

const TableHeaderCell = styled.div<{ basis?: string; grow?: number; shrink?: number }>`
  flex-basis: ${(props) => props?.basis};
  flex-grow: ${(props) => props?.grow};
  flex-shrink: ${(props) => props?.shrink};
  overflow: hidden;
  display: flex;
  align-items: center;
  text-align: center;
  border-left: 1px solid #b3b3b3aa;
`

const TableCellText = styled.p`
  text-align: center;
  margin: 0 auto;
`

const TableRow = styled.div<{ even?: boolean }>`
  display: flex;
  align-items: stretch;
  background-color: ${(props) => (props.even ? '#e2e2e2' : '#fcfcfc')};
`

const TableCell = styled.div<{ basis?: string; grow?: number; shrink?: number }>`
  flex-basis: ${(props) => props?.basis};
  flex-grow: ${(props) => props?.grow};
  flex-shrink: ${(props) => props?.shrink};
  overflow: hidden;
  display: flex;
  align-items: center;
  text-align: center;
  border-left: 1px solid #b3b3b3aa;
`

const TableCellName = styled(TableCell)<{ basis?: string; grow?: number; shrink?: number }>`
  text-align: left;
  padding-left: 5px;
`

const TableRowPending = styled(TableRow)`
  background-color: ${(props) => (props.even ? '#e2e2e2aa55' : '#fcfcfc55')};
  color: #818181;
`

const TableRowError = styled(TableRow)`
  background-color: #f5cbc6;
  color: #962d26;
`

// const Row = memo((props) => {
//   const { index, style, data } = props
//   const { status, seqName, errors, result: sequence } = data[index]
//
//   if (!sequence) {
//     return (
//       <TableRow style={style}>
//         <ColumnName seqName={seqName} sequence={sequence} />
//         {/*<TableCell className="results-table-col results-table-col-clade " />*/}
//       </TableRow>
//     )
//   }
//
//   return (
//     <TableRow style={style}>
//       <TableCell>
//         <ColumnName seqName={seqName} sequence={sequence} />
//       </TableCell>
//       <TableCell>
//         <ColumnQCStatus sequence={sequence} />
//       </TableCell>
//       <TableCell>
//         <ColumnClade sequence={sequence} />
//       </TableCell>
//       <TableCell>
//         <ColumnMutations sequence={sequence} />
//       </TableCell>
//       <TableCell>
//         <ColumnNonACGTNs sequence={sequence} />
//       </TableCell>
//       <TableCell>
//         <ColumnMissing sequence={sequence} />
//       </TableCell>
//       <TableCell>
//         <ColumnGaps sequence={sequence} />
//       </TableCell>
//       <TableCell>
//         <SequenceView key={seqName} sequence={sequence} />
//       </TableCell>
//     </TableRow>
//   )
// }, areEqual)

const Row = memo((props: ListChildComponentProps) => {
  const { t } = useTranslation()

  const { index, style, data, isScrolling } = props
  const { status, seqName, errors, result: sequence } = data[index]

  if (errors.length > 0) {
    return (
      <TableRowError style={style} even={index % 2 === 0}>
        <TableCellName basis="200px" shrink={3}>
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
        <TableCellName basis="200px" shrink={3}>
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
      <TableCellName basis="200px" shrink={3}>
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
}, areEqual)

export function ResultsTable({ result }) {
  const { t } = useTranslation()

  const data = result
  // const data = Array.from(range(100))

  return (
    <Table>
      <TableHeaderRow>
        <TableHeaderCell basis="200px" shrink={3}>
          <TableCellText>{t('Sequence name')}</TableCellText>
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
              {Row}
            </FixedSizeList>
          )
        }}
      </AutoSizer>
    </Table>
  )
}
