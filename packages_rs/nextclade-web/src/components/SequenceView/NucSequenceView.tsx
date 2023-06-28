import { maxBy, minBy } from 'lodash'
import React from 'react'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { useRecoilValue } from 'recoil'
import { SequenceViewSVG, SequenceViewText, SequenceViewWrapper } from 'src/components/SequenceView/FullSequenceView'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { maxNucMarkersAtom } from 'src/state/seqViewSettings.state'
import { PeptideWarning, rangeContains, rangeIntersectOrNone, Range } from 'src/types'
import type { AnalysisResult } from 'src/types'
import { geneAtom } from 'src/state/results.state'
import { SequenceMarkerGap } from './SequenceMarkerGap'
import { SequenceMarkerMissing } from './SequenceMarkerMissing'
import { SequenceMarkerMutation } from './SequenceMarkerMutation'
import { SequenceMarkerFrameShift } from './SequenceMarkerFrameShift'
import { SequenceMarkerInsertion } from './SequenceMarkerInsertion'

export interface NucSequenceViewProps extends ReactResizeDetectorDimensions {
  sequence: AnalysisResult
  warnings?: PeptideWarning[]
  viewedGene: string
}

function trimToRange<T extends { range: Range }>(inputs: T[], range: Range): T[] {
  return inputs
    .map((input) => {
      const intersection = rangeIntersectOrNone(range, input.range)
      return intersection ? { ...input, range: intersection } : undefined
    })
    .filter(notUndefinedOrNull)
}

export function NucSequenceViewUnsized({ sequence, width, viewedGene }: NucSequenceViewProps) {
  const { t } = useTranslationSafe()
  const maxNucMarkers = useRecoilValue(maxNucMarkersAtom)

  const gene = useRecoilValue(geneAtom(viewedGene))

  if (!width || !gene || gene.cdses.length === 0) {
    return (
      <SequenceViewWrapper>
        <SequenceViewSVG fill="transparent" viewBox={`0 0 10 10`} />
      </SequenceViewWrapper>
    )
  }

  const { index, seqName, nucToAaMuts } = sequence

  const cdsSegments = gene.cdses.flatMap((cds) => cds.segments)
  const cdsStart = minBy(cdsSegments, (seg) => seg.range.begin)?.range.begin ?? 0
  const cdsEnd = maxBy(cdsSegments, (seg) => seg.range.end)?.range.end ?? 0
  const cdsLen = cdsEnd - cdsStart

  const substitutions = cdsSegments.flatMap((seg) =>
    sequence.substitutions.filter((sub) => rangeContains(seg.range, sub.pos)),
  )

  const missing = cdsSegments.flatMap((seg) => trimToRange(sequence.missing, seg.range))

  const deletions = cdsSegments.flatMap((seg) => trimToRange(sequence.deletions, seg.range))

  const insertions = cdsSegments.flatMap((seg) =>
    sequence.insertions.filter((ins) => rangeContains(seg.range, ins.pos)),
  )

  const frameShifts = cdsSegments.flatMap((seg) =>
    sequence.frameShifts
      .flatMap((fs) =>
        fs.nucAbs
          .flatMap((fsRange) => {
            const intersection = rangeIntersectOrNone(seg.range, fsRange)
            return intersection ? { ...fs, nucAbs: [intersection] } : undefined
          })
          .filter(notUndefinedOrNull),
      )
      .filter(notUndefinedOrNull),
  )

  // const alignmentRanges = cdsSegments
  //   .flatMap((seg) => {
  //     return rangeIntersectOrNone(alignmentRange, seg.range)
  //   })
  //   .filter(notUndefinedOrNull)

  const pixelsPerBase = width / cdsLen

  const mutationViews = substitutions.map((substitution) => {
    return (
      <SequenceMarkerMutation
        key={substitution.pos}
        index={index}
        seqName={seqName}
        substitution={substitution}
        nucToAaMuts={nucToAaMuts}
        pixelsPerBase={pixelsPerBase}
        offsetPos={cdsStart}
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
        offsetPos={cdsStart}
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
        offsetPos={cdsStart}
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
        offsetPos={cdsStart}
      />
    )
  })

  const frameShiftMarkers = frameShifts.map((frameShift) => (
    <SequenceMarkerFrameShift
      key={`${frameShift.geneName}_${frameShift.nucAbs.map((na) => na.begin).join('-')}`}
      index={index}
      seqName={seqName}
      frameShift={frameShift}
      pixelsPerBase={pixelsPerBase}
      offsetPos={cdsStart}
    />
  ))

  // const unsequenced = unsequencedRanges.map((range, index) => (
  //   <SequenceMarkerUnsequenced
  //     key={`${seqName}-${formatRange(range)}`}
  //     index={index}
  //     seqName={seqName}
  //     range={range}
  //     pixelsPerBase={pixelsPerBase}
  //   />
  // ))

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
        <rect fill="transparent" x={0} y={-10} width={cdsLen} height="30" />

        {/* {unsequenced} */}

        {mutationViews}
        {missingViews}
        {deletionViews}
        {insertionViews}

        {frameShiftMarkers}
      </SequenceViewSVG>
    </SequenceViewWrapper>
  )
}

export const NucSequenceViewUnmemoed = withResizeDetector(NucSequenceViewUnsized)

export const NucSequenceView = React.memo(NucSequenceViewUnmemoed)
