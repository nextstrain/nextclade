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
  width: 100%;
  height: 100%;
  //background-color: #c3dfad;
  //border: #79bf47 solid 3px;
`

const TableHeaderRow = styled.div`
  display: flex;
  height: ${HEADER_ROW_HEIGHT}px;
  overflow-y: scroll;
`

const TableHeaderCell = styled.div`
  flex-basis: ${(props) => (props?.basis ? `${props?.basis}%` : '5%')};
  flex-grow: ${(props) => props?.grow ?? 1};
  flex-shrink: 1;
  background-color: #cdc4da;
  border: #7b47c3 solid 1px;
  //overflow: hidden;
  z-index: 1000;
`

const TableRow = styled.div`
  display: flex;
  background-color: ${(props) => (props.even ? '#fff' : '#ccc')};
`

const TableCell = styled.div`
  flex-basis: ${(props) => (props?.basis ? `${props?.basis}%` : '5%')};
  flex-grow: ${(props) => props?.grow ?? 1};
  flex-shrink: 1;
  //background-color: #dacdca;
  border: #c36247 solid 1px;
  overflow: hidden;
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
      <TableRow style={style} even={index % 2 === 0}>
        <TableCell grow={10}>
          <ColumnName seqName={seqName} sequence={sequence} />
        </TableCell>
        <TableCell grow={100}>{errors}</TableCell>
      </TableRow>
    )
  }

  if (!sequence) {
    return (
      <TableRow style={style} even={index % 2 === 0}>
        <TableCell grow={10}>
          <ColumnName seqName={seqName} sequence={sequence} />
        </TableCell>
        <TableCell grow={100}>{errors}</TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow style={style} even={index % 2 === 0}>
      <TableCell grow={10}>
        <ColumnName seqName={seqName} sequence={sequence} />
      </TableCell>

      <TableCell grow={1}>
        <ColumnQCStatus sequence={sequence} />
      </TableCell>

      <TableCell grow={1}>
        <ColumnClade sequence={sequence} />
      </TableCell>

      <TableCell grow={1}>
        <ColumnMutations sequence={sequence} />
      </TableCell>

      <TableCell grow={1}>
        <ColumnNonACGTNs sequence={sequence} />
      </TableCell>

      <TableCell grow={1}>
        <ColumnMissing sequence={sequence} />
      </TableCell>

      <TableCell grow={1}>
        <ColumnGaps sequence={sequence} />
      </TableCell>

      <TableCell grow={50}>
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
        <TableHeaderCell grow={10}>{t('Sequence name')}</TableHeaderCell>
        <TableHeaderCell grow={1}>{t('QC')}</TableHeaderCell>
        <TableHeaderCell grow={1}>{t('Clade')}</TableHeaderCell>
        <TableHeaderCell grow={1}>{t('Mut.')}</TableHeaderCell>
        <TableHeaderCell grow={1}>{t('non-ACGTN')}</TableHeaderCell>
        <TableHeaderCell grow={1}>{t('Ns')}</TableHeaderCell>
        <TableHeaderCell grow={1}>{t('Gaps')}</TableHeaderCell>
        <TableHeaderCell grow={50}>{t('Sequence')}</TableHeaderCell>
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
