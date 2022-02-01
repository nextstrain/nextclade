import React, { useCallback, useState } from 'react'

import { connect } from 'react-redux'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { Alert as ReactstrapAlert } from 'reactstrap'
import { setSequenceViewPan, setSequenceViewZoom } from 'src/state/ui/ui.actions'
import styled from 'styled-components'

import type { AnalysisResult, Gene, GeneWarning, Warnings } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { selectGeneMap } from 'src/state/algorithm/algorithm.selectors'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { getSafeId } from 'src/helpers/getSafeId'

import { WarningIcon } from 'src/components/Results/getStatusIconAndText'
import { Tooltip } from 'src/components/Results/Tooltip'

import { PeptideMarkerMutationGroup } from './PeptideMarkerMutationGroup'
import { SequenceViewWrapper, SequenceViewSVG } from './SequenceView'
import { groupAdjacentAminoacidChanges } from './groupAdjacentAminoacidChanges'
import { PeptideMarkerUnknown } from './PeptideMarkerUnknown'
import { PeptideMarkerFrameShift } from './PeptideMarkerFrameShift'

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
  reasons: GeneWarning[]
}

export function PeptideViewMissing({ geneName, reasons }: PeptideViewMissingProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const id = getSafeId('sequence-label', { geneName })

  return (
    <MissingRow
      id={id}
      className="w-100 h-100 d-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="m-auto">{t('Gene "{{ geneName }}" is missing', { geneName })}</span>
      <Tooltip
        wide
        fullWidth
        target={id}
        isOpen={showTooltip}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <p>{t('This gene is missing due to the following errors during analysis: ')}</p>
        {reasons.map((warn) => (
          <Alert key={warn.geneName} color="warning" fade={false} className="px-2 py-1 my-1">
            <WarningIcon />
            {warn.message}
          </Alert>
        ))}
      </Tooltip>
    </MissingRow>
  )
}

export interface PeptideViewProps extends ReactResizeDetectorDimensions {
  sequence: AnalysisResult
  warnings: Warnings
  geneMap?: Gene[]
  viewedGene: string
  zoom: number
  pan: number
  setSequenceViewPan(pan: number): void
  setSequenceViewZoom(pan: number): void
}

const mapStateToProps = (state: State) => ({
  geneMap: selectGeneMap(state),
  zoom: state.ui.sequenceView.zoom,
  pan: state.ui.sequenceView.pan,
})

const mapDispatchToProps = {
  setSequenceViewPan,
  setSequenceViewZoom,
}

export const PeptideViewUnsized = connect(mapStateToProps, mapDispatchToProps)(PeptideViewUnsizedDisconnected)

export function PeptideViewUnsizedDisconnected({
  sequence,
  width,
  warnings,
  geneMap,
  viewedGene,
  zoom,
  pan,
  setSequenceViewPan,
  setSequenceViewZoom,
}: PeptideViewProps) {
  const { t } = useTranslationSafe()

  const handleScroll = useCallback(
    (delta: number) => {
      setSequenceViewPan(pan - 0.001 * delta)
    },
    [pan, setSequenceViewPan],
  )

  const handleWheel = useCallback(
    (delta: number) => {
      setSequenceViewZoom(zoom - 0.0005 * delta)
    },
    [zoom, setSequenceViewZoom],
  )

  if (!width || !geneMap) {
    return (
      <SequenceViewWrapper onScroll={handleScroll} onWheel={handleWheel}>
        <SequenceViewSVG fill="transparent" viewBox={`0 0 10 10`} />
      </SequenceViewWrapper>
    )
  }

  const gene = geneMap.find((gene) => gene.geneName === viewedGene)
  if (!gene) {
    return (
      <SequenceViewWrapper onScroll={handleScroll} onWheel={handleWheel}>
        {t('Gene {{geneName}} is missing in gene map', { geneName: viewedGene })}
      </SequenceViewWrapper>
    )
  }

  const warningsForThisGene = warnings.inGenes.filter((warn) => warn.geneName === viewedGene)
  if (warningsForThisGene.length > 0) {
    return (
      <SequenceViewWrapper onScroll={handleScroll} onWheel={handleWheel}>
        <PeptideViewMissing geneName={gene.geneName} reasons={warningsForThisGene} />
      </SequenceViewWrapper>
    )
  }

  const { seqName, unknownAaRanges } = sequence
  const zoomedWidth = width * zoom
  const pixelPan = pan * width
  const pixelsPerAa = width / Math.round(gene.length / 3)

  const aaSubstitutions = sequence.aaSubstitutions.filter((aaSub) => aaSub.gene === viewedGene)
  const aaDeletions = sequence.aaDeletions.filter((aaSub) => aaSub.gene === viewedGene)
  const groups = groupAdjacentAminoacidChanges(aaSubstitutions, aaDeletions)

  const unknownAaRangesForGene = unknownAaRanges.find((range) => range.geneName === viewedGene)

  const frameShiftMarkers = sequence.frameShifts
    .filter((frameShift) => frameShift.geneName === gene.geneName)
    .map((frameShift) => (
      <PeptideMarkerFrameShift
        key={`${frameShift.geneName}_${frameShift.nucAbs.begin}`}
        seqName={seqName}
        frameShift={frameShift}
        pixelsPerAa={pixelsPerAa}
      />
    ))

  return (
    <SequenceViewWrapper onScroll={handleScroll} onWheel={handleWheel}>
      <SequenceViewSVG width={width} height={30} viewBox={`${pixelPan} 0 ${zoomedWidth} 10`}>
        <rect fill="transparent" x={0} y={-10} width={gene.length} height="30" />

        {unknownAaRangesForGene &&
          unknownAaRangesForGene.ranges.map((range) => (
            <PeptideMarkerUnknown key={range.begin} seqName={seqName} range={range} pixelsPerAa={pixelsPerAa} />
          ))}

        {groups.map((group) => {
          return (
            <PeptideMarkerMutationGroup
              key={group.codonAaRange.begin}
              seqName={seqName}
              group={group}
              pixelsPerAa={pixelsPerAa}
            />
          )
        })}
        {frameShiftMarkers}
      </SequenceViewSVG>
    </SequenceViewWrapper>
  )
}

export const PeptideViewUnmemoed = withResizeDetector(PeptideViewUnsized)

export const PeptideView = React.memo(PeptideViewUnmemoed)
