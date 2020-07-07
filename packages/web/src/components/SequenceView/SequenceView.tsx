import React from 'react'

import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'

import type { AnalysisResult } from 'src/algorithms/types'

import { SequenceMarkerGap } from './SequenceMarkerGap'
import { SequenceMarkerMissing } from './SequenceMarkerMissing'
import { SequenceMarkerMutation } from './SequenceMarkerMutation'

export const GENOME_SIZE = 30000 as const // TODO: deduce from sequences?

export interface SequenceViewProps extends ReactResizeDetectorDimensions {
  sequence: AnalysisResult
}

export const SequenceView = withResizeDetector(SequenceViewUnsized)

export function SequenceViewUnsized({ sequence, width }: SequenceViewProps) {
  const { seqName, substitutions, missing, deletions } = sequence

  if (!width) {
    return (
      <div className="sequence-view-wrapper d-inline-flex w-100 h-100">
        <svg className="sequence-view-body" viewBox={`0 0 10 10`} />
      </div>
    )
  }

  const pixelsPerBase = width / GENOME_SIZE

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
        key={oneMissing.begin}
        seqName={seqName}
        missing={oneMissing}
        pixelsPerBase={pixelsPerBase}
      />
    )
  })

  const deletionViews = deletions.map((deletion) => {
    return (
      <SequenceMarkerGap key={deletion.start} seqName={seqName} deletion={deletion} pixelsPerBase={pixelsPerBase} />
    )
  })

  return (
    <div className="sequence-view-wrapper d-inline-flex w-100 h-100">
      <svg className="sequence-view-body" viewBox={`0 0 ${width} 10`}>
        <rect className="sequence-view-background" x={0} y={-10} width={GENOME_SIZE} height="30" />
        {mutationViews}
        {missingViews}
        {deletionViews}
      </svg>
    </div>
  )
}
