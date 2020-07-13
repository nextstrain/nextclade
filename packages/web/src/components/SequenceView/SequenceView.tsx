import React from 'react'

import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import styled from 'styled-components'

import type { AnalysisResult } from 'src/algorithms/types'

import { SequenceMarkerGap } from './SequenceMarkerGap'
import { SequenceMarkerMissing } from './SequenceMarkerMissing'
import { SequenceMarkerMutation } from './SequenceMarkerMutation'

export const GENOME_SIZE = 30000 as const // TODO: deduce from sequences?

export const SequenceViewWrapper = styled.div`
  display: flex;
  width: 100%;
  height: 30px;
  margin-top: 0;
  margin-bottom: 0;
  vertical-align: middle;
  margin: 0;
  padding: 0;
`

export const SequenceViewSVG = styled.svg`
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
`

export interface SequenceViewProps extends ReactResizeDetectorDimensions {
  sequence: AnalysisResult
}

export const SequenceView = withResizeDetector(SequenceViewUnsized)

export function SequenceViewUnsized({ sequence, width }: SequenceViewProps) {
  const { seqName, substitutions, missing, deletions } = sequence

  if (!width) {
    return (
      <SequenceViewWrapper>
        <SequenceViewSVG fill="transparent" viewBox={`0 0 10 10`} />
      </SequenceViewWrapper>
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
    <SequenceViewWrapper>
      <SequenceViewSVG viewBox={`0 0 ${width} 10`}>
        <rect fill="transparent" x={0} y={-10} width={GENOME_SIZE} height="30" />
        {mutationViews}
        {missingViews}
        {deletionViews}
      </SequenceViewSVG>
    </SequenceViewWrapper>
  )
}
