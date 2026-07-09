import React from 'react'
import type { AnalysisResult } from 'src/types'
import { SequenceMarkerRecombination } from './SequenceMarkerRecombination'

// Recombinant intervals are fixed reference-coordinate ranges, same x-axis in every nucleotide
// view regardless of "Relative to" selection. Shared by absolute and relative views.

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
