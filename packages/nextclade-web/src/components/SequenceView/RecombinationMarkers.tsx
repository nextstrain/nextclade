import React from 'react'
import type { AnalysisResult } from 'src/types'
import { SequenceMarkerRecombination } from './SequenceMarkerRecombination'

// Recombination is a view-independent, per-sequence property: the detected intervals are fixed
// reference-coordinate ranges, computed once against the tree-inferred parent. The x-axis is
// reference position in every nucleotide view, so this layer renders identically regardless of the
// "Relative to" selection. It is shared by both the absolute (Reference) and relative views so the
// markers appear in all nucleotide views.

export function recombinationMarkerCount(sequence: AnalysisResult): number {
  return sequence.recombination?.regions.length ?? 0
}

export interface RecombinationMarkersProps {
  sequence: AnalysisResult
  pixelsPerBase: number
}

export function RecombinationMarkers({ sequence, pixelsPerBase }: RecombinationMarkersProps) {
  const { index, seqName, recombination } = sequence
  return (
    <>
      {(recombination?.regions ?? []).map((region) => (
        <SequenceMarkerRecombination
          key={`recombination_${region.range.begin}-${region.range.end}`}
          index={index}
          seqName={seqName}
          region={region.range}
          confidence={region.confidence}
          pixelsPerBase={pixelsPerBase}
        />
      ))}
    </>
  )
}
