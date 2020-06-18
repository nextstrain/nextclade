import React, { useState } from 'react'

import { Table } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import type { AlgorithmResult, AnalyzeSeqResult } from 'src/algorithms/run'
import { GENOME_SIZE, SequenceView } from './SequenceView'
import { getSequenceIdentifier, LabelTooltip } from './LabelTooltip'
import { GeneMap } from './GeneMap'
import { Axis } from 'src/components/Main/Axis'

export interface SequenceLabelProps {
  sequence: AnalyzeSeqResult
}

export function SequenceLabel({ sequence }: SequenceLabelProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { seqName } = sequence
  const id = getSequenceIdentifier(seqName)

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
  sequence: AnalyzeSeqResult
}

export function SequenceClade({ sequence }: SequenceCladeProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { clades, seqName } = sequence
  const id = getSequenceIdentifier(seqName)
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

export type ResultProps = AlgorithmResult

export function Result({ result }: ResultProps) {
  const { t } = useTranslation()

  if (!result) {
    return null
  }

  const genomeSize = GENOME_SIZE // FIXME: deduce from sequences

  const sequenceItems = result.map((sequence, i) => {
    const { seqName } = sequence

    return (
      <tr className="results-table-row" key={seqName}>
        <SequenceLabel sequence={sequence} />
        <SequenceClade sequence={sequence} />
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
            <th className="results-table-header">{t('Clades')}</th>
            <th className="results-table-header">{t('Mutations')}</th>
          </tr>
        </thead>
        <tbody>
          {sequenceItems}
          <tr className="results-table-row">
            <td className="results-table-col" />
            <td className="results-table-col" />
            <td className="results-table-col results-table-col-gene-map">
              <GeneMap />
            </td>
          </tr>
          <tr className="results-table-row">
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
