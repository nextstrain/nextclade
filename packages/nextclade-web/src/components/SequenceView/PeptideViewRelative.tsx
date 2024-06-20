import React from 'react'
import { getAaMutations } from 'src/helpers/relativeMuts'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { AnalysisResult, Cds, cdsCodonLength } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { formatRange } from 'src/helpers/formatRange'
import { SequenceMarkerUnsequenced } from 'src/components/SequenceView/SequenceMarkerUnsequenced'
import { PeptideMarkerMutationGroup } from './PeptideMarkerMutationGroup'
import { PeptideMarkerUnknown } from './PeptideMarkerUnknown'
import { PeptideMarkerFrameShift } from './PeptideMarkerFrameShift'
import { PeptideMarkerInsertion } from './PeptideMarkerInsertion'
import { SequenceViewSVG } from './SequenceViewStyles'

export interface PeptideViewRelativeProps {
  sequence: AnalysisResult
  width: number
  cds: Cds
  refNodeName: string
}

export function PeptideViewRelativeUnmemoed({ width, cds, sequence, refNodeName }: PeptideViewRelativeProps) {
  const { t } = useTranslationSafe()

  const { index, seqName, unknownAaRanges, frameShifts, aaInsertions, aaUnsequencedRanges } = sequence

  const cdsLength = cdsCodonLength(cds)
  const pixelsPerAa = width / Math.round(cdsLength)

  const unknownAaRangesForGene = unknownAaRanges.find((range) => range.cdsName === cds.name)
  const unsequencedRanges = aaUnsequencedRanges[cds.name] ?? []

  const allMuts = getAaMutations(sequence, refNodeName)
  if (!allMuts) {
    return (
      <div className="d-flex w-100 h-100">
        <div className="d-flex m-auto">{t('Not applicable')}</div>
      </div>
    )
  }

  const { relAaMuts } = allMuts
  const groups = relAaMuts?.find((m) => m.cdsName === cds.name)?.aaChangesGroups ?? []

  const frameShiftMarkers = frameShifts
    .filter((frameShift) => frameShift.cdsName === cds.name)
    .map((frameShift) => {
      const id = getSafeId('frame-shift-aa-marker', { ...frameShift })
      return (
        <PeptideMarkerFrameShift
          key={id}
          index={index}
          seqName={seqName}
          frameShift={frameShift}
          pixelsPerAa={pixelsPerAa}
        />
      )
    })

  const insertionMarkers = aaInsertions
    .filter((ins) => ins.cds === cds.name)
    .map((insertion) => {
      return (
        <PeptideMarkerInsertion
          key={insertion.pos}
          index={index}
          seqName={seqName}
          insertion={insertion}
          pixelsPerAa={pixelsPerAa}
        />
      )
    })

  const unsequenced = unsequencedRanges.map((range, index) => (
    <SequenceMarkerUnsequenced
      key={`${seqName}-${formatRange(range)}`}
      index={index}
      seqName={seqName}
      range={range}
      pixelsPerBase={pixelsPerAa}
    />
  ))

  return (
    <SequenceViewSVG viewBox={`0 0 ${width} 10`}>
      <rect fill="transparent" x={0} y={-10} width={cdsLength} height="30" />

      {unsequenced}

      {unknownAaRangesForGene &&
        unknownAaRangesForGene.ranges.map((range) => (
          <PeptideMarkerUnknown
            key={range.range.begin}
            index={index}
            seqName={seqName}
            range={range}
            pixelsPerAa={pixelsPerAa}
          />
        ))}

      {groups.map((group) => {
        return (
          <PeptideMarkerMutationGroup
            key={group.range.begin}
            index={index}
            seqName={seqName}
            group={group}
            pixelsPerAa={pixelsPerAa}
          />
        )
      })}
      {frameShiftMarkers}
      {insertionMarkers}
    </SequenceViewSVG>
  )
}

export const PeptideViewRelative = React.memo(PeptideViewRelativeUnmemoed)
