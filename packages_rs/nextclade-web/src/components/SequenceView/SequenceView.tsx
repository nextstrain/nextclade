import isEqual from 'react-fast-compare'
import React, { useCallback, useMemo } from 'react'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'
import { Button } from 'reactstrap'
import type { AnalysisResult } from 'src/algorithms/types'
import { maxNumNucMarkersAtom, maxTotalNucMarkersAtom } from 'src/state/seqViewSettings.state'
import { genomeSizeAtom, numNucMarkersAtom, totalNucMarkersAtom } from 'src/state/results.state'
import { isSettingsDialogOpenAtom } from 'src/state/settings.state'
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
  font-size: 0.85rem;
  margin: auto 1rem;
  cursor: help;
`

const SettingsShortcut = styled(Button)`
  padding: 0;
  font-size: 0.85rem;
  color: ${(props) => props.theme.bodyColor};
  text-decoration-line: underline !important;
  text-decoration-color: ${(props) => props.theme.bodyColor} !important;
  text-decoration-style: dashed !important;
`

export interface SequenceViewProps extends ReactResizeDetectorDimensions {
  sequence: AnalysisResult
}

export function SequenceViewUnsized({ sequence, width }: SequenceViewProps) {
  const { seqName, substitutions, missing, deletions, alignmentStart, alignmentEnd, frameShifts, insertions } = sequence

  const { t } = useTranslationSafe()
  const maxNumNucMarkers = useRecoilValue(maxNumNucMarkersAtom)
  const numNucMarkers = useRecoilValue(numNucMarkersAtom(seqName))

  const maxTotalNucMarkers = useRecoilValue(maxTotalNucMarkersAtom)
  const totalNucMarkers = useRecoilValue(totalNucMarkersAtom)

  const genomeSize = useRecoilValue(genomeSizeAtom)

  const setIsSettingsDialogOpen = useSetRecoilState(isSettingsDialogOpenAtom)
  const onSettingsClicked = useCallback(() => {
    setIsSettingsDialogOpen(true)
  }, [setIsSettingsDialogOpen])

  const views = useMemo(() => {
    if (!width) {
      return null
    }

    const viewBox = `0 0 ${width} 10`

    const pixelsPerBase = width / genomeSize

    const unsequencedStartView = (
      <SequenceMarkerUnsequencedStart seqName={seqName} alignmentStart={alignmentStart} pixelsPerBase={pixelsPerBase} />
    )

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

    const insertionViews = insertions.map((insertion) => {
      return (
        <SequenceMarkerInsertion
          key={insertion.pos}
          seqName={seqName}
          insertion={insertion}
          pixelsPerBase={pixelsPerBase}
        />
      )
    })

    const unsequencedEndView = (
      <SequenceMarkerUnsequencedEnd
        seqName={seqName}
        genomeSize={genomeSize}
        alignmentEnd={alignmentEnd}
        pixelsPerBase={pixelsPerBase}
      />
    )

    const frameShiftMarkers = frameShifts.map((frameShift) => (
      <SequenceMarkerFrameShift
        key={`${frameShift.geneName}_${frameShift.nucAbs.begin}`}
        seqName={seqName}
        frameShift={frameShift}
        pixelsPerBase={pixelsPerBase}
      />
    ))

    return {
      viewBox,
      unsequencedStartView,
      mutationViews,
      missingViews,
      deletionViews,
      insertionViews,
      unsequencedEndView,
      frameShiftMarkers,
    }
  }, [
    alignmentEnd,
    alignmentStart,
    deletions,
    frameShifts,
    genomeSize,
    insertions,
    missing,
    seqName,
    substitutions,
    width,
  ])

  if (!width) {
    return (
      <SequenceViewWrapper>
        <SequenceViewSVG fill="transparent" viewBox={`0 0 10 10`} />
      </SequenceViewWrapper>
    )
  }

  if (totalNucMarkers > maxTotalNucMarkers) {
    return (
      <SequenceViewWrapper>
        <SequenceViewText
          title={t(
            "Markers are the colored rectangles which represent mutations, deletions etc. There is a technical limit of how many of those can be displayed at a time, depending on how fast your computer is. You can tune the threshold in the 'Settings' dialog, accessible with the button on the top panel.",
          )}
        >
          {t(
            'Too many markers (total: {{totalNucMarkers}}, this sequence: {{numNucMarkers}}). The threshold ({{maxTotalNucMarkers}}) can be increased in ',
            { numNucMarkers, totalNucMarkers, maxTotalNucMarkers },
          )}
          <SettingsShortcut color="link" onClick={onSettingsClicked}>
            {t('Settings')}
          </SettingsShortcut>
        </SequenceViewText>
      </SequenceViewWrapper>
    )
  }

  if (numNucMarkers > maxNumNucMarkers) {
    return (
      <SequenceViewWrapper>
        <SequenceViewText
          title={t(
            "Markers are the colored rectangles which represent mutations, deletions etc. There is a technical limit of how many of those can be displayed at a time, depending on how fast your computer is. You can tune the threshold in the 'Settings' dialog, accessible with the button on the top panel.",
          )}
        >
          {t(
            'Too many markers to display for this sequence ({{numNucMarkers}}). The threshold ({{maxNumNucMarkers}}) can be increased in ',
            { numNucMarkers, maxNumNucMarkers },
          )}
          <SettingsShortcut color="link" onClick={onSettingsClicked}>
            {t('Settings')}
          </SettingsShortcut>
        </SequenceViewText>
      </SequenceViewWrapper>
    )
  }

  if (!views) {
    return null
  }

  const {
    viewBox,
    unsequencedStartView,
    mutationViews,
    missingViews,
    deletionViews,
    insertionViews,
    unsequencedEndView,
    frameShiftMarkers,
  } = views

  return (
    <SequenceViewWrapper>
      <SequenceViewSVG viewBox={viewBox}>
        <rect fill="transparent" x={0} y={-10} width={genomeSize} height="30" />
        {unsequencedStartView}
        {mutationViews}
        {missingViews}
        {deletionViews}
        {insertionViews}
        {unsequencedEndView}
        {frameShiftMarkers}
      </SequenceViewSVG>
    </SequenceViewWrapper>
  )
}

export const SequenceViewUnmemoed = withResizeDetector(SequenceViewUnsized)

export const SequenceView = React.memo(SequenceViewUnmemoed, isEqual)
