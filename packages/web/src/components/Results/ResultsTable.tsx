import React from 'react'

import { connect } from 'react-redux'
// import { Table } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useTable, useBlockLayout, useFlexLayout } from 'react-table'
import { FixedSizeList } from 'react-window'

import type { State } from 'src/state/reducer'
import type { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'

// import { GeneMap } from 'src/components/GeneMap/GeneMap'
// import { GeneMapAxis } from 'src/components/GeneMap/GeneMapAxis'
import { GENOME_SIZE, SequenceView } from 'src/components/SequenceView/SequenceView'
import { AnalysisResult } from 'src/algorithms/types'
import { FAKE_DATA } from 'src/components/Results/FAKE_DATA'
// import { ColumnGaps } from 'src/components/Results/ColumnGaps'
// import { ColumnMissing } from 'src/components/Results/ColumnMissing'
// import { ColumnName } from 'src/components/Results/ColumnName'
// import { ColumnClade } from 'src/components/Results/ColumnClade'
// import { ColumnQCStatus } from 'src/components/Results/ColumnQCStatus'
// import { ColumnMutations } from 'src/components/Results/ColumnMutations'
// import { ColumnNonACGTNs } from 'src/components/Results/ColumnNonACGTNs'

const mapStateToProps = (state: State) => ({
  result: state.algorithm.results,
})

const mapDispatchToProps = {}

export const ResultsTable = connect(mapStateToProps, mapDispatchToProps)(ResultDisconnected)

export interface ResultProps {
  result: SequenceAnylysisState[]
}

const Styles = styled.div`
  padding: 1rem;

  .table {
    display: inline-block;
    border-spacing: 0;
    border: 1px solid black;

    .tr {
      :last-child {
        .td {
          border-bottom: 0;
        }
      }
    }

    .th,
    .td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;

      :last-child {
        border-right: 0;
      }
    }
  }
`

export function ResultDisconnected({ result }: ResultProps) {
  const genomeSize = GENOME_SIZE // FIXME: deduce from sequences
  const data = FAKE_DATA

  const { t } = useTranslation()

  const columns = React.useMemo(
    () => [
      { Header: 'Sequence', accessor: (r: AnalysisResult) => r.seqName },
      { Header: 'QC', accessor: (r: AnalysisResult) => (r.diagnostics.flags.length > 0 ? 'Fail' : 'Pass') },
      { Header: 'Clade', accessor: (r: AnalysisResult) => Object.keys(r.clades).join(',') },
      { Header: 'Mut', accessor: (r: AnalysisResult) => r.totalMutations },
      { Header: 'non', accessor: (r: AnalysisResult) => r.totalNonACGTNs },
      { Header: 'Ns', accessor: (r: AnalysisResult) => r.totalMissing },
      { Header: 'Gaps', accessor: (r: AnalysisResult) => r.totalGaps },
    ],
    [],
  )

  const defaultColumn = React.useMemo(
    () => ({
      width: 150,
    }),
    [],
  )

  const { getTableProps, getTableBodyProps, headers, rows, totalColumnsWidth, prepareRow } = useTable(
    {
      columns,
      data,
      defaultColumn,
    },
    useFlexLayout,
  )

  const RenderRow = React.useCallback(
    ({ index, style }) => {
      const row = rows[index]
      prepareRow(row)
      return (
        <div {...row.getRowProps({ style })} className="tr">
          {row.cells.map((cell) => (
            <div {...cell.getCellProps()} className="td">
              {cell.render('Cell')}
            </div>
          ))}
        </div>
      )
    },
    [prepareRow, rows],
  )

  return (
    <Styles>
      <div {...getTableProps()} className="table">
        <div>
          {headers.map((column) => (
            <div {...column.getHeaderProps()} className="th">
              {column.render('Header')}
            </div>
          ))}
        </div>

        <div {...getTableBodyProps()}>
          <FixedSizeList height={400} itemCount={rows.length} itemSize={35} width={totalColumnsWidth}>
            {RenderRow}
          </FixedSizeList>
        </div>
      </div>
    </Styles>
  )

  // const data = React.useMemo(() => makeData(100000), [])

  // return <Table columns={columns} data={FAKE_DATA} />

  // const sequenceItems = result.map(({ status, seqName, errors, result: sequence }, i) => {
  //   if (errors.length > 0) {
  //     return (
  //       <tr className="results-table-row results-table-danger" key={seqName}>
  //         <ColumnName seqName={seqName} sequence={sequence} />
  //         <td colSpan={7} className="results-table-col results-table-col-clade">
  //           {errors}
  //         </td>
  //       </tr>
  //     )
  //   }
  //
  //   if (!sequence) {
  //     return (
  //       <tr className="results-table-row" key={seqName}>
  //         <ColumnName seqName={seqName} sequence={sequence} />
  //         <td colSpan={7} className="results-table-col results-table-col-clade" />
  //       </tr>
  //     )
  //   }
  //
  //   return (
  //     <tr className="results-table-row" key={seqName}>
  //       <ColumnName seqName={seqName} sequence={sequence} />
  //       <ColumnQCStatus sequence={sequence} />
  //       <ColumnClade sequence={sequence} />
  //       <ColumnMutations sequence={sequence} />
  //       <ColumnNonACGTNs sequence={sequence} />
  //       <ColumnMissing sequence={sequence} />
  //       <ColumnGaps sequence={sequence} />
  //       <td className="results-table-col results-table-col-mutations">
  //         <SequenceView key={seqName} sequence={sequence} />
  //       </td>
  //     </tr>
  //   )
  // })
  //
  // return (
  //   <>
  //     <Table className="results-table">
  //       <thead>
  //         <tr className="results-table-row">
  //           <th className="results-table-header">{t('Sequence name')}</th>
  //           <th className="results-table-header">{t('QC')}</th>
  //           <th className="results-table-header">{t('Clade')}</th>
  //           <th className="results-table-header">{t('Mut.')}</th>
  //           <th className="results-table-header">{t('non-ACGTN')}</th>
  //           <th className="results-table-header">{t('Ns')}</th>
  //           <th className="results-table-header">{t('Gaps')}</th>
  //           <th className="results-table-header">{t('Sequence')}</th>
  //         </tr>
  //       </thead>
  //       <tbody>
  //         {sequenceItems}
  //         <tr className="results-table-row">
  //           <td className="results-table-col">Genome annotation</td>
  //           <td className="results-table-col" />
  //           <td className="results-table-col" />
  //           <td className="results-table-col" />
  //           <td className="results-table-col" />
  //           <td className="results-table-col" />
  //           <td className="results-table-col" />
  //           <td className="results-table-col results-table-col-gene-map">
  //             <GeneMap />
  //           </td>
  //         </tr>
  //         <tr className="results-table-row">
  //           <td className="results-table-col" />
  //           <td className="results-table-col" />
  //           <td className="results-table-col" />
  //           <td className="results-table-col" />
  //           <td className="results-table-col" />
  //           <td className="results-table-col" />
  //           <td className="results-table-col" />
  //           <td className="results-table-col results-table-col-axis">
  //             <GeneMapAxis genomeSize={genomeSize} />
  //           </td>
  //         </tr>
  //       </tbody>
  //     </Table>
  //   </>
  // )
}
