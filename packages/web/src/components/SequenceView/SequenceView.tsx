import React from 'react'

import ReactResizeDetector from 'react-resize-detector'

import type { AnalysisResult } from 'src/algorithms/types'

import { SequenceMarkerGap } from './SequenceMarkerGap'
import { SequenceMarkerMissing } from './SequenceMarkerMissing'
import { SequenceMarkerMutation } from './SequenceMarkerMutation'

export const GENOME_SIZE = 30000 as const // TODO: deduce from sequences?

export interface SequenceViewProps {
  sequence: AnalysisResult
}

export function SequenceView({ sequence }: SequenceViewProps) {
  const { seqName, substitutions, missing, deletions } = sequence

  return (
    <ReactResizeDetector handleWidth refreshRate={300} refreshMode="debounce">
      {({ width: widthPx }: { width?: number }) => {
        if (!widthPx) {
          return <div className="w-100 h-100" />
        }

        const pixelsPerBase = widthPx / GENOME_SIZE

        const mutationViews = substitutions.map((substitution) => {
          return (
            <SequenceMarkerMutation
              key={substitution.pos}
              seqName={seqName}
              substitution={substitution}
              pixelsPerBase={pixelsPerBase}
            />
          )
        })

        const missingViews = missing.map((oneMissing) => {
          return (
            <SequenceMarkerMissing
              key={oneMissing.range.begin}
              seqName={seqName}
              missing={oneMissing}
              pixelsPerBase={pixelsPerBase}
            />
          )
        })

        const deletionViews = deletions.map((deletion) => {
          return (
            <SequenceMarkerGap
              key={deletion.start}
              seqName={seqName}
              deletion={deletion}
              pixelsPerBase={pixelsPerBase}
            />
          )
        })

        return (
          <div className="sequence-view-wrapper d-inline-flex">
            <svg className="sequence-view-body" viewBox={`0 0 ${widthPx} 10`}>
              <rect className="sequence-view-background" x={0} y={-10} width={GENOME_SIZE} height="30" />
              {mutationViews}
              {missingViews}
              {deletionViews}
            </svg>
          </div>
        )
      }}
    </ReactResizeDetector>
  )
}
