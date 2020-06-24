import React, { useState } from 'react'

import { Table } from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { DeepReadonly } from 'ts-essentials'

import { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'

import { Axis } from './Axis'
import { GENOME_SIZE, SequenceView } from './SequenceView'
import { calculateNucleotidesTotals, LabelTooltip } from './LabelTooltip'
import { GeneMap } from './GeneMap'

import { connect } from 'react-redux'
import { State } from 'src/state/reducer'
import { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'

export interface SequenceLabelProps {
  sequence: AnalysisResult
}

export function SequenceLabel({ sequence }: SequenceLabelProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { seqName } = sequence
  const id = getSafeId('sequence-label', { seqName })

  return (
    <>
      <td
        id={id}
        className="results-table-col results-table-col-label"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {seqName}
      </td>
      <LabelTooltip showTooltip={showTooltip} sequence={sequence} />
    </>
  )
}

export interface SequenceCladeProps {
  sequence: AnalysisResult
}

export function SequenceClade({ sequence }: SequenceCladeProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { clades, seqName } = sequence
  const id = getSafeId('clade-label', { seqName })
  const cladesList = Object.keys(clades).join(', ')

  return (
    <>
      <td
        id={id}
        className="results-table-col results-table-col-clade"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {cladesList}
      </td>
      <LabelTooltip showTooltip={showTooltip} sequence={sequence} />
    </>
  )
}

export interface SequenceQCStatusProps {
  sequence: AnalysisResult
}

export function SequenceQCStatus({ sequence }: SequenceQCStatusProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { seqName, diagnostics } = sequence
  const id = getSafeId('qc-label', { seqName })

  return (
    <>
      <td
        id={id}
        className="results-table-col results-table-col-clade"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {diagnostics.flags.length > 0 ? 'FAIL' : 'PASS'}
      </td>
      <LabelTooltip showTooltip={showTooltip} sequence={sequence} />
    </>
  )
}

export function SequenceNonACGTNs({ sequence }: SequenceCladeProps) {
  const { diagnostics, seqName } = sequence
  const id = getSafeId('nonacgtn-label', { seqName })
  const goodBases = new Set(['A', 'C', 'G', 'T', 'N', '-'])
  const nonACGTN = Object.keys(diagnostics.nucleotideComposition)
    .filter((d) => !goodBases.has(d))
    .reduce((a, b) => a + diagnostics.nucleotideComposition[b], 0)

  return (
    <>
      <td id={id} className="results-table-col results-table-col-clade">
        {nonACGTN}
      </td>
    </>
  )
}

export function SequenceNs({ sequence }: SequenceCladeProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { missing, seqName } = sequence
  const id = getSafeId('ns-label', { seqName })
  const totalNs = calculateNucleotidesTotals(missing, 'N')

  return (
    <>
      <td
        id={id}
        className="results-table-col results-table-col-clade"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {totalNs}
      </td>
      <LabelTooltip showTooltip={showTooltip} sequence={sequence} />
    </>
  )
}

export function SequenceGaps({ sequence }: SequenceCladeProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { deletions, seqName } = sequence
  const id = getSafeId('gaps-label', { seqName })

  const totalGaps = deletions.reduce((acc, curr) => acc + curr.length, 0)

  return (
    <>
      <td
        id={id}
        className="results-table-col results-table-col-clade"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {totalGaps}
      </td>
      <LabelTooltip showTooltip={showTooltip} sequence={sequence} />
    </>
  )
}

const mapStateToProps = (state: State) => ({
  result: state.algorithm.results,
})

const mapDispatchToProps = {}

export const Result = connect(mapStateToProps, mapDispatchToProps)(ResultDisconnected)

export interface ResultProps {
  result: SequenceAnylysisState[]
}

export function ResultDisconnected({ result }: ResultProps) {
  const { t } = useTranslation()

  const genomeSize = GENOME_SIZE // FIXME: deduce from sequences

  const sequenceItems = result.map(({ status, seqName, result: sequence }, i) => {
    if (!sequence) {
      return null
    }

    return (
      <tr className="results-table-row" key={seqName}>
        <SequenceLabel sequence={sequence} />
        <SequenceQCStatus sequence={sequence} />
        <SequenceClade sequence={sequence} />
        <SequenceNonACGTNs sequence={sequence} />
        <SequenceNs sequence={sequence} />
        <SequenceGaps sequence={sequence} />
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
            <th className="results-table-header">{t('Clades')}</th>
            <th className="results-table-header">{t('non-ACGTN')}</th>
            <th className="results-table-header">{t('Ns')}</th>
            <th className="results-table-header">{t('Gaps')}</th>
            <th className="results-table-header">{t('Mutations')}</th>
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
            <td className="results-table-col results-table-col-axis">
              <Axis genomeSize={genomeSize} />
            </td>
          </tr>
        </tbody>
      </Table>
    </>
  )
}
