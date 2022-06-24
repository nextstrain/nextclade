import { clamp } from 'lodash'
import React, { useCallback } from 'react'

import { connect } from 'react-redux'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import styled from 'styled-components'

import { selectGenomeSize } from 'src/state/algorithm/algorithm.selectors'
import type { State } from 'src/state/reducer'
import { setSequenceViewPan, setSequenceViewZoom } from 'src/state/ui/ui.actions'
import { HorizontalDragScroll } from 'src/components/Common/HorizontalDragScroll'
import type { AnalysisResult } from 'src/algorithms/types'

import { SequenceMarkerGap } from './SequenceMarkerGap'
import { SequenceMarkerMissing } from './SequenceMarkerMissing'
import { SequenceMarkerMutation } from './SequenceMarkerMutation'
import { SequenceMarkerUnsequencedEnd, SequenceMarkerUnsequencedStart } from './SequenceMarkerUnsequenced'
import { SequenceMarkerFrameShift } from './SequenceMarkerFrameShift'

export const SequenceViewWrapper = styled(HorizontalDragScroll)`
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
`

export interface SequenceViewProps extends ReactResizeDetectorDimensions {
  sequence: AnalysisResult
  genomeSize?: number
  zoom: number
  pan: number
  setSequenceViewPan(pan: number): void
  setSequenceViewZoom(pan: number): void
}

const mapStateToProps = (state: State) => ({
  genomeSize: selectGenomeSize(state),
  zoom: state.ui.sequenceView.zoom,
  pan: state.ui.sequenceView.pan,
})

const mapDispatchToProps = {
  setSequenceViewPan,
  setSequenceViewZoom,
}

export const SequenceViewUnsized = connect(mapStateToProps, mapDispatchToProps)(SequenceViewUnsizedDisconnected)

export function SequenceViewUnsizedDisconnected({
  sequence,
  width,
  genomeSize,
  zoom,
  pan,
  setSequenceViewPan,
  setSequenceViewZoom,
}: SequenceViewProps) {
  const { seqName, substitutions, missing, deletions, alignmentStart, alignmentEnd, frameShifts } = sequence

  const handleScroll = useCallback(
    (delta: number) => {
      const newPan = clamp(pan - 0.001 * delta, -1, 1)
      setSequenceViewPan(newPan)
    },
    [pan, setSequenceViewPan],
  )

  const handleWheel = useCallback(
    (delta: number) => {
      const newZoom = clamp(zoom - 0.01 * delta, 1, 5)
      setSequenceViewZoom(newZoom)
    },
    [zoom, setSequenceViewZoom],
  )

  if (!width || !genomeSize) {
    return (
      <SequenceViewWrapper onScroll={handleScroll} onWheel={handleWheel}>
        <SequenceViewSVG fill="transparent" viewBox={`0 0 10 10`} />
      </SequenceViewWrapper>
    )
  }

  const pixelsPerBase = width / genomeSize
  const zoomedWidth = width * (1 / zoom)
  const pixelPan = pan * zoomedWidth * (1 / zoom)

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

  const frameShiftMarkers = frameShifts.map((frameShift) => (
    <SequenceMarkerFrameShift
      key={`${frameShift.geneName}_${frameShift.nucAbs.begin}`}
      seqName={seqName}
      frameShift={frameShift}
      pixelsPerBase={pixelsPerBase}
    />
  ))

  return (
    <SequenceViewWrapper onScroll={handleScroll} onWheel={handleWheel}>
      <SequenceViewSVG width={width} height={30} viewBox={`${pixelPan} 0 ${zoomedWidth} 10`}>
        <rect fill="transparent" x={0} y={-10} width={genomeSize} height="30" />
        <SequenceMarkerUnsequencedStart
          seqName={seqName}
          alignmentStart={alignmentStart}
          pixelsPerBase={pixelsPerBase}
        />
        {mutationViews}
        {missingViews}
        {deletionViews}
        <SequenceMarkerUnsequencedEnd
          seqName={seqName}
          genomeSize={genomeSize}
          alignmentEnd={alignmentEnd}
          pixelsPerBase={pixelsPerBase}
        />
        {frameShiftMarkers}
      </SequenceViewSVG>
    </SequenceViewWrapper>
  )
}

export const SequenceViewUnmemoed = withResizeDetector(SequenceViewUnsized)

export const SequenceView = React.memo(SequenceViewUnmemoed)
