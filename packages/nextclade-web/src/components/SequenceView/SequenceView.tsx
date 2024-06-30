import React from 'react'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { useRecoilValue } from 'recoil'
import { SequenceMarkerAmbiguous } from 'src/components/SequenceView/SequenceMarkerAmbiguous'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { maxNucMarkersAtom } from 'src/state/seqViewSettings.state'
import styled from 'styled-components'

import type { AnalysisResult } from 'src/types'
import { genomeSizeAtom } from 'src/state/results.state'
import { SequenceMarkerGap } from './SequenceMarkerGap'
import { SequenceMarkerMissing } from './SequenceMarkerMissing'
import { SequenceMarkerMutation } from './SequenceMarkerMutation'
import { SequenceMarkerUnsequencedEnd, SequenceMarkerUnsequencedStart } from './SequenceMarkerUnsequenced'
import { SequenceMarkerFrameShift } from './SequenceMarkerFrameShift'
import { SequenceMarkerInsertion } from './SequenceMarkerInsertion'

export const SequenceViewWrapper = styled.div`
  display: flex;
  width: 100%;
  height: 30px;
  vertical-align: middle;
  margin: 0;
  padding: 0;
`

export const SequenceViewSVG = styled.svg`
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
`

export const SequenceViewText = styled.p`
  margin: auto;
`

export interface SequenceViewProps extends ReactResizeDetectorDimensions {
  sequence: AnalysisResult
}

export function SequenceViewUnsized({ sequence, width }: SequenceViewProps) {
  const {
    index,
    seqName,
    substitutions,
    missing,
    deletions,
    alignmentRange,
    frameShifts,
    insertions,
    nucToAaMuts,
    nonACGTNs,
  } = sequence

  const { t } = useTranslationSafe()
  const maxNucMarkers = useRecoilValue(maxNucMarkersAtom)

  const genomeSize = useRecoilValue(genomeSizeAtom)

  if (!width) {
    return (
      <SequenceViewWrapper>
        <SequenceViewSVG fill="transparent" viewBox={`0 0 10 10`} />
      </SequenceViewWrapper>
    )
  }

  const pixelsPerBase = width / genomeSize

  const mutationViews = substitutions.map((substitution) => {
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

  const deletionViews = deletions.map((deletion) => {
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
      <SequenceViewWrapper>
        <SequenceViewText
          title={t(
            "Markers are the colored rectangles which represent mutations, deletions etc. There is a technical limit of how many of those can be displayed at a time, depending on how fast your computer is. You can tune the threshold in the 'Settings' dialog, accessible with the button on the top panel.",
          )}
        >
          {t(
            'Too many markers to display ({{totalMarkers}}). The threshold ({{maxNucMarkers}}) can be increased in "Settings" dialog',
            { totalMarkers, maxNucMarkers },
          )}
        </SequenceViewText>
      </SequenceViewWrapper>
    )
  }

  return (
    <SequenceViewWrapper>
      <SequenceViewSVG viewBox={`0 0 ${width} 10`}>
        <rect fill="transparent" x={0} y={-10} width={genomeSize} height="30" />
        <SequenceMarkerUnsequencedStart
          index={index}
          seqName={seqName}
          alignmentStart={alignmentRange.begin}
          pixelsPerBase={pixelsPerBase}
        />
        {mutationViews}
        {missingViews}
        {ambigViews}
        {deletionViews}
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
    </SequenceViewWrapper>
  )
}

export const SequenceViewUnmemoed = withResizeDetector(SequenceViewUnsized)

export const SequenceView = React.memo(SequenceViewUnmemoed)
