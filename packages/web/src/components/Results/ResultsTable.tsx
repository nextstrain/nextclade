import React from 'react'

import { connect } from 'react-redux'
import { Table } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import type { State } from 'src/state/reducer'
import type { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'

import { GeneMap } from 'src/components/GeneMap/GeneMap'
import { GeneMapAxis } from 'src/components/GeneMap/GeneMapAxis'
import { GENOME_SIZE, SequenceView } from 'src/components/SequenceView/SequenceView'
import { ColumnGaps } from 'src/components/Results/ColumnGaps'
import { ColumnMissing } from 'src/components/Results/ColumnMissing'
import { ColumnName } from 'src/components/Results/ColumnName'
import { ColumnClade } from 'src/components/Results/ColumnClade'
import { ColumnQCStatus } from 'src/components/Results/ColumnQCStatus'
import { ColumnMutations } from 'src/components/Results/ColumnMutations'
import { ColumnNonACGTNs } from 'src/components/Results/ColumnNonACGTNs'

const mapStateToProps = (state: State) => ({
  result: state.algorithm.results,
})

const mapDispatchToProps = {}

export const ResultsTable = connect(mapStateToProps, mapDispatchToProps)(ResultDisconnected)

export interface ResultProps {
  result: SequenceAnylysisState[]
}

export function ResultDisconnected({ result }: ResultProps) {
  const { t } = useTranslation()

  const genomeSize = GENOME_SIZE // FIXME: deduce from sequences

  const sequenceItems = result.map(({ status, seqName, result: sequence }, i) => {
    if (!sequence) {
      return (
        <tr className="results-table-row" key={seqName}>
          <ColumnName seqName={seqName} sequence={sequence} />
          <td colSpan={7} className="results-table-col results-table-col-clade" />
        </tr>
      )
    }

    return (
      <tr className="results-table-row" key={seqName}>
        <ColumnName seqName={seqName} sequence={sequence} />
        <ColumnQCStatus sequence={sequence} />
        <ColumnClade sequence={sequence} />
        <ColumnMutations sequence={sequence} />
        <ColumnNonACGTNs sequence={sequence} />
        <ColumnMissing sequence={sequence} />
        <ColumnGaps sequence={sequence} />
        <td className="results-table-col results-table-col-mutations">
          <SequenceView key={seqName} sequence={sequence} />
        </td>
      </tr>
    )
  })

  return (
    <>
      <Table className="results-table">
        <thead>
          <tr className="results-table-row">
            <th className="results-table-header">{t('Sequence name')}</th>
            <th className="results-table-header">{t('QC')}</th>
            <th className="results-table-header">{t('Clade')}</th>
            <th className="results-table-header">{t('Mut.')}</th>
            <th className="results-table-header">{t('non-ACGTN')}</th>
            <th className="results-table-header">{t('Ns')}</th>
            <th className="results-table-header">{t('Gaps')}</th>
            <th className="results-table-header">{t('Sequence')}</th>
          </tr>
        </thead>
        <tbody>
          {sequenceItems}
          <tr className="results-table-row">
            <td className="results-table-col">Genome annotation</td>
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col results-table-col-gene-map">
              <GeneMap />
            </td>
          </tr>
          <tr className="results-table-row">
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col results-table-col-axis">
              <GeneMapAxis genomeSize={genomeSize} />
            </td>
          </tr>
        </tbody>
      </Table>
    </>
  )
}
