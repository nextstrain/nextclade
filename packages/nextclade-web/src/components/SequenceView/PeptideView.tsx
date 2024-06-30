import React, { useCallback, useState } from 'react'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { Alert as ReactstrapAlert } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import type { AnalysisResult, Gene, PeptideWarning } from 'src/types'
import { cdsCodonLength } from 'src/types'
import { cdsAtom } from 'src/state/results.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { getSafeId } from 'src/helpers/getSafeId'
import { formatRange } from 'src/helpers/formatRange'
import { SequenceMarkerUnsequenced } from 'src/components/SequenceView/SequenceMarkerUnsequenced'
import { WarningIcon } from 'src/components/Results/getStatusIconAndText'
import { Tooltip } from 'src/components/Results/Tooltip'
import { PeptideMarkerMutationGroup } from './PeptideMarkerMutationGroup'
import { SequenceViewWrapper, SequenceViewSVG } from './SequenceView'
import { PeptideMarkerUnknown } from './PeptideMarkerUnknown'
import { PeptideMarkerFrameShift } from './PeptideMarkerFrameShift'
import { PeptideMarkerInsertion } from './PeptideMarkerInsertion'

const MissingRow = styled.div`
  background-color: ${(props) => props.theme.gray650};
  color: ${(props) => props.theme.gray100};
  margin: auto;
  cursor: pointer;
  box-shadow: 2px 2px 5px #0005 inset;
`

const Alert = styled(ReactstrapAlert)`
  box-shadow: ${(props) => props.theme.shadows.slight};
  max-width: 400px;
`

export interface PeptideViewMissingProps {
  geneName: string
  reasons: PeptideWarning[]
}

export function PeptideViewMissing({ geneName, reasons }: PeptideViewMissingProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const id = getSafeId('sequence-label', { geneName })

  return (
    <MissingRow id={id} className="w-100 h-100 d-flex" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <span className="m-auto">{t('Gene "{{ geneName }}" is missing', { geneName })}</span>
      <Tooltip wide fullWidth target={id} isOpen={showTooltip} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <p>{t('This gene is missing due to the following errors during analysis: ')}</p>
        {reasons.map((warn) => (
          <Alert key={warn.cdsName} color="warning" fade={false} className="px-2 py-1 my-1">
            <WarningIcon />
            {warn.warning}
          </Alert>
        ))}
      </Tooltip>
    </MissingRow>
  )
}

export interface PeptideViewProps extends ReactResizeDetectorDimensions {
  sequence: AnalysisResult
  warnings?: PeptideWarning[]
  geneMap?: Gene[]
  viewedGene: string
}

export function PeptideViewUnsized({ width, sequence, warnings, viewedGene }: PeptideViewProps) {
  const { t } = useTranslationSafe()
  const cds = useRecoilValue(cdsAtom(viewedGene))

  if (!width) {
    return (
      <SequenceViewWrapper>
        <SequenceViewSVG fill="transparent" viewBox={`0 0 10 10`} />
      </SequenceViewWrapper>
    )
  }

  if (!cds) {
    return (
      <SequenceViewWrapper>
        {t('{{cds}} {{geneName}} is missing in genome annotation', { cds: 'CDS', geneName: viewedGene })}
      </SequenceViewWrapper>
    )
  }

  const warningsForThisGene = (warnings ?? []).filter((warn) => warn.cdsName === viewedGene)
  if (warningsForThisGene.length > 0) {
    return (
      <SequenceViewWrapper>
        <PeptideViewMissing geneName={cds.name} reasons={warningsForThisGene} />
      </SequenceViewWrapper>
    )
  }

  const { index, seqName, unknownAaRanges, frameShifts, aaChangesGroups, aaInsertions, aaUnsequencedRanges } = sequence
  const cdsLength = cdsCodonLength(cds)
  const pixelsPerAa = width / Math.round(cdsLength)
  const groups = aaChangesGroups.filter((group) => group.name === viewedGene)

  const unknownAaRangesForGene = unknownAaRanges.find((range) => range.cdsName === viewedGene)
  const unsequencedRanges = aaUnsequencedRanges[viewedGene] ?? []

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
    .filter((ins) => ins.cds === viewedGene)
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
    <SequenceViewWrapper>
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
    </SequenceViewWrapper>
  )
}

export const PeptideViewUnmemoed = withResizeDetector(PeptideViewUnsized)

export const PeptideView = React.memo(PeptideViewUnmemoed)
