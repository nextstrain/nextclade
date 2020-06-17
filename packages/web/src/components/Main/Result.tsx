import React, { useMemo } from 'react'

import { get } from 'lodash'

import type { AlgorithmResult, AnalyzeSeqResult, Substitutions } from 'src/algorithms/run'
import ReactResizeDetector from 'react-resize-detector'
import { Table } from 'reactstrap'
import { useTranslation } from 'react-i18next'

export type ResultProps = AlgorithmResult

const GENOME_SIZE = 30000 as const
const BASE_MIN_WIDTH_PX = 4 as const

const BASE_COLORS = {
  A: '#1167b7',
  T: '#ad871c',
  G: '#79ac34',
  C: '#d04343',
  N: '#222222',
} as const

export function getBaseColor(allele: string) {
  return get(BASE_COLORS, allele) ?? BASE_COLORS.N
}

export interface SequenceViewProps {
  sequence: AnalyzeSeqResult
}

export function SequenceView({ sequence }: SequenceViewProps) {
  return (
    <ReactResizeDetector handleWidth refreshRate={300} refreshMode="debounce">
      {({ width: widthPx }: { width?: number }) => {
        if (!widthPx) {
          return <div className="w-100 h-100" />
        }

        const pixelsPerBase = widthPx / GENOME_SIZE
        const width = Math.max(BASE_MIN_WIDTH_PX, 1 * pixelsPerBase)

        const mutationViews = Object.entries(sequence.mutations).map(([position, allele]) => {
          const x = Number.parseInt(position, 10) * pixelsPerBase
          return <rect key={position} fill={getBaseColor(allele)} x={x} y={-10} width={width} height="30" />
        })

        return (
          <div className="sequence-view-wrapper d-inline-flex">
            <svg className="sequence-view-body" viewBox={`0 0 ${widthPx} 10`}>
              <rect className="sequence-view-background" x={0} y={-10} width={GENOME_SIZE} height="30" />
              {mutationViews}
            </svg>
          </div>
        )
      }}
    </ReactResizeDetector>
  )
}

export function Result({ result }: ResultProps) {
  const { t } = useTranslation()

  if (!result) {
    return null
  }

  const rows = result.map((sequence, i) => (
    <tr className="results-table-row" key={sequence.seqName}>
      <td className="results-table-col results-table-col-label">{sequence.seqName}</td>
      <td className="results-table-col results-table-col-clade">{Object.keys(sequence.clades)[0]}</td>
      <td className="results-table-col results-table-col-mutations">
        <SequenceView key={sequence.seqName} sequence={sequence} />
      </td>
    </tr>
  ))

  return (
    <Table className="results-table">
      <tr className="results-table-row">
        <th className="results-table-header">{t('Sequence name')}</th>
        <th className="results-table-header">{t('Clade')}</th>
        <th className="results-table-header">{t('Mutations')}</th>
      </tr>
      {rows}
    </Table>
  )
}
