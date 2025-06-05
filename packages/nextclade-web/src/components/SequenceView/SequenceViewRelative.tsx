import { safeDiv } from 'src/helpers/number'
import { getNucMutations } from 'src/helpers/relativeMuts'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { viewedDatasetNameAtom } from 'src/state/dataset.state'
import { maxNucMarkersAtom } from 'src/state/seqViewSettings.state'
import { AnalysisResult } from 'src/types'
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
import { SequenceViewSVG } from './SequenceViewStyles'

export interface SequenceViewRelativeProps {
  sequence: AnalysisResult
  width: number
  refNodeName: string
}

export function SequenceViewRelative({ sequence, width, refNodeName }: SequenceViewRelativeProps) {
  const { index, seqName, missing, alignmentRange, frameShifts, insertions, nucToAaMuts, nonACGTNs } = sequence

  const { t } = useTranslationSafe()
  const maxNucMarkers = useRecoilValue(maxNucMarkersAtom)

  const datasetName = useRecoilValue(viewedDatasetNameAtom)
  const genomeSize = useRecoilValue(genomeSizeAtom({ datasetName })) ?? 0
  const pixelsPerBase = safeDiv(width, genomeSize)

  const muts = getNucMutations(sequence, refNodeName)
  if (!muts) {
    return (
      <div className="d-flex w-100 h-100">
        <div className="d-flex m-auto">{t('Not applicable')}</div>
      </div>
    )
  }

  const mutationViews = muts.subs.map((substitution) => (
    <SequenceMarkerMutation
      key={substitution.pos}
      index={index}
      seqName={seqName}
      substitution={substitution}
      nucToAaMuts={nucToAaMuts}
      pixelsPerBase={pixelsPerBase}
    />
  ))

  const deletionViews = (muts.relMuts?.privateDeletionRanges ?? []).map((deletion) => (
    <SequenceMarkerGap
      key={deletion.range.begin}
      index={index}
      seqName={seqName}
      deletion={deletion}
      nucToAaMuts={nucToAaMuts}
      pixelsPerBase={pixelsPerBase}
    />
  ))

  const missingViews = missing.map((oneMissing) => (
    <SequenceMarkerMissing
      key={oneMissing.range.begin}
      index={index}
      seqName={seqName}
      missing={oneMissing}
      pixelsPerBase={pixelsPerBase}
    />
  ))

  const ambigViews = nonACGTNs.map((ambig) => (
    <SequenceMarkerAmbiguous
      key={ambig.range.begin}
      index={index}
      seqName={seqName}
      ambiguous={ambig}
      pixelsPerBase={pixelsPerBase}
    />
  ))

  const insertionViews = insertions.map((insertion) => (
    <SequenceMarkerInsertion
      key={insertion.pos}
      index={index}
      seqName={seqName}
      insertion={insertion}
      pixelsPerBase={pixelsPerBase}
    />
  ))

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
    <SequenceViewSVG viewBox={`0 0 ${width} 10`}>
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
    </SequenceViewSVG>
  )
}
