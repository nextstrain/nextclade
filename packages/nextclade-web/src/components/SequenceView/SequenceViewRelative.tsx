import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { maxNucMarkersAtom } from 'src/state/seqViewSettings.state'
import type { AnalysisResult } from 'src/types'
import React from 'react'
import { useRecoilValue } from 'recoil'
import { genomeSizeAtom } from 'src/state/results.state'
import { SequenceMarkerMutation } from './SequenceMarkerMutation'
import { SequenceMarkerGap } from './SequenceMarkerGap'
import { SequenceMarkerAmbiguous } from './SequenceMarkerAmbiguous'
import { SequenceMarkerMissing } from './SequenceMarkerMissing'
import { SequenceMarkerFrameShift } from './SequenceMarkerFrameShift'
import { SequenceMarkerInsertion } from './SequenceMarkerInsertion'
import { SequenceMarkerUnsequencedEnd, SequenceMarkerUnsequencedStart } from './SequenceMarkerUnsequenced'

export interface SequenceViewRelativeProps {
  sequence: AnalysisResult
  width: number
  refNodeName: string
}

export function SequenceViewRelative({ sequence, width, refNodeName }: SequenceViewRelativeProps) {
  const {
    index,
    seqName,
    missing,
    alignmentRange,
    frameShifts,
    insertions,
    nucToAaMuts,
    nonACGTNs,
    relativeNucMutations,
    privateNucMutations,
  } = sequence

  const { t } = useTranslationSafe()
  const maxNucMarkers = useRecoilValue(maxNucMarkersAtom)

  const genomeSize = useRecoilValue(genomeSizeAtom)
  const pixelsPerBase = width / genomeSize

  const muts =
    refNodeName === '_parent'
      ? privateNucMutations
      : relativeNucMutations.find((relMuts) => relMuts.refNode.name === refNodeName)?.muts

  const mutationViews = (muts?.privateSubstitutions ?? []).map((substitution) => {
    return (
      <SequenceMarkerMutation
        key={substitution.pos}
        index={index}
        seqName={seqName}
        substitution={substitution}
        nucToAaMuts={nucToAaMuts}
        pixelsPerBase={pixelsPerBase}
      />
    )
  })

  const deletionViews = (muts?.privateDeletionRanges ?? []).map((deletion) => {
    return (
      <SequenceMarkerGap
        key={deletion.range.begin}
        index={index}
        seqName={seqName}
        deletion={deletion}
        nucToAaMuts={nucToAaMuts}
        pixelsPerBase={pixelsPerBase}
      />
    )
  })

  const missingViews = missing.map((oneMissing) => {
    return (
      <SequenceMarkerMissing
        key={oneMissing.range.begin}
        index={index}
        seqName={seqName}
        missing={oneMissing}
        pixelsPerBase={pixelsPerBase}
      />
    )
  })

  const ambigViews = nonACGTNs.map((ambig) => {
    return (
      <SequenceMarkerAmbiguous
        key={ambig.range.begin}
        index={index}
        seqName={seqName}
        ambiguous={ambig}
        pixelsPerBase={pixelsPerBase}
      />
    )
  })

  const insertionViews = insertions.map((insertion) => {
    return (
      <SequenceMarkerInsertion
        key={insertion.pos}
        index={index}
        seqName={seqName}
        insertion={insertion}
        pixelsPerBase={pixelsPerBase}
      />
    )
  })

  const frameShiftMarkers = frameShifts.map((frameShift) => (
    <SequenceMarkerFrameShift
      key={`${frameShift.cdsName}_${frameShift.nucAbs.map((na) => na.begin).join('-')}`}
      index={index}
      seqName={seqName}
      frameShift={frameShift}
      pixelsPerBase={pixelsPerBase}
    />
  ))

  const totalMarkers =
    mutationViews.length + deletionViews.length + missingViews.length + frameShiftMarkers.length + insertionViews.length

  if (totalMarkers > maxNucMarkers) {
    return (
      <p
        title={t(
          "Markers are the colored rectangles which represent mutations, deletions etc. There is a technical limit of how many of those can be displayed at a time, depending on how fast your computer is. You can tune the threshold in the 'Settings' dialog, accessible with the button on the top panel.",
        )}
      >
        {t(
          'Too many markers to display ({{totalMarkers}}). The threshold ({{maxNucMarkers}}) can be increased in "Settings" dialog',
          { totalMarkers, maxNucMarkers },
        )}
      </p>
    )
  }

  return (
    <>
      <SequenceMarkerUnsequencedStart
        index={index}
        seqName={seqName}
        alignmentStart={alignmentRange.begin}
        pixelsPerBase={pixelsPerBase}
      />
      {mutationViews}
      {deletionViews}
      {missingViews}
      {ambigViews}
      {insertionViews}
      <SequenceMarkerUnsequencedEnd
        index={index}
        seqName={seqName}
        genomeSize={genomeSize}
        alignmentEnd={alignmentRange.end}
        pixelsPerBase={pixelsPerBase}
      />
      {frameShiftMarkers}
    </>
  )
}
