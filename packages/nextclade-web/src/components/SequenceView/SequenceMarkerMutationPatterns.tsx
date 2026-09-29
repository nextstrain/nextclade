import React, { SVGProps, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import styled, { useTheme } from 'styled-components'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'

import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfMutationsGeneric } from 'src/components/Results/ListOfMutationsGeneric'
import { MutationPatternEventBadge, mutationPatternEventKey } from 'src/components/Common/MutationPatternEventBadge'
import { BASE_MIN_WIDTH_PX } from 'src/constants'
import { getSafeId } from 'src/helpers/getSafeId'
import { focusedMutationPatternIdAtom } from 'src/state/results.state'
import {
  SeqMarkerHeightState,
  getSeqMarkerDims,
  seqMarkerMutationPatternHeightStateAtom,
} from 'src/state/seqViewSettings.state'
import type {
  MutationPatternCluster,
  MutationPatternEventMatch,
  MutationPatternResults,
  MutationPatternsResults,
} from 'src/gen/_SchemaRoot'

// Pattern markers are dark and hollow or small, so that they stand out from mutation markers of any nucleotide color
// and leave them visible
const CLUSTER_FRAME_STROKE_WIDTH = 1.5
const CLUSTER_FRAME_PADDING_PX = 3
// Dash pattern per lane, so that clusters of different patterns differ without relying on color
const CLUSTER_FRAME_DASHES = [undefined, '3 2', '1 2']
// Width of the invisible band along the frame that opens the tooltip. The inside stays free, so that the mutation
// markers inside the cluster keep their own tooltips
const CLUSTER_HOVER_STROKE_WIDTH = 6
const MATCH_MARK_WIDTH_PX = 7
const MATCH_MARK_HEIGHT_PX = 6
const MATCH_MARK_OUTLINE_WIDTH = 0.75

/** Opacity of the markers of other mutations and patterns while a mutation pattern is in focus */
export const UNFOCUSED_MARKER_OPACITY = 0.2

const TooltipBadgeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 4px;
`

const TooltipNote = styled.div`
  margin-top: 4px;
  font-size: 0.85em;
  color: ${(props) => props.theme.gray600};
`

/** Vertical extent of the lane of one pattern inside the pattern marker band, or `undefined` when the band is off */
function usePatternLane(lane: number, laneCount: number) {
  const heightState = useRecoilValue(seqMarkerMutationPatternHeightStateAtom)
  return useMemo(() => {
    if (heightState === SeqMarkerHeightState.Off) {
      return undefined
    }
    const band = getSeqMarkerDims(heightState)
    const laneHeight = band.height / Math.max(laneCount, 1)
    return { y: band.y + lane * laneHeight, height: laneHeight }
  }, [heightState, lane, laneCount])
}

/** Tooltip visibility and pattern focus, both following the mouse pointer */
function usePatternHover(patternId: string) {
  const [isHovered, setIsHovered] = useState(false)
  const setFocusedPatternId = useSetRecoilState(focusedMutationPatternIdAtom)
  const onMouseEnter = useCallback(() => {
    setIsHovered(true)
    setFocusedPatternId(patternId)
  }, [patternId, setFocusedPatternId])
  const onMouseLeave = useCallback(() => {
    setIsHovered(false)
    setFocusedPatternId(undefined)
  }, [setFocusedPatternId])

  // A marker can unmount under the pointer, for example when the table scrolls, without a `mouseleave` event
  const isHoveredRef = useRef(false)
  isHoveredRef.current = isHovered
  useEffect(
    () => () => {
      if (isHoveredRef.current) {
        setFocusedPatternId(undefined)
      }
    },
    [setFocusedPatternId],
  )

  return { isHovered, onMouseEnter, onMouseLeave }
}

interface PatternMarkerProps {
  index: number
  seqName: string
  pattern: MutationPatternResults
  /** Vertical lane of this pattern inside the pattern marker band */
  lane: number
  /** Number of lanes: one per configured pattern, so that markers of different patterns never cover each other */
  laneCount: number
  pixelsPerBase: number
}

export interface SequenceMarkerPatternMatchProps extends PatternMarkerProps {
  event: MutationPatternEventMatch
}

/** Triangle over one matched mutation, pointing down from the top of the lane of its pattern. It points away from the
 * insertion markers, which are triangles pointing up from the bottom of the row */
function SequenceMarkerPatternMatchUnmemoed({
  index,
  seqName,
  pattern,
  event,
  lane,
  laneCount,
  pixelsPerBase,
}: SequenceMarkerPatternMatchProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const laneDims = usePatternLane(lane, laneCount)
  const { isHovered, onMouseEnter, onMouseLeave } = usePatternHover(pattern.id)

  if (!laneDims) {
    return null
  }

  const id = getSafeId('pattern-match-marker', { index, seqName, patternId: pattern.id, key: mutationPatternEventKey(event) })

  const cx = event.pos * pixelsPerBase
  const halfWidth = MATCH_MARK_WIDTH_PX / 2
  const top = laneDims.y
  const points = `${cx - halfWidth},${top} ${cx + halfWidth},${top} ${cx},${top + MATCH_MARK_HEIGHT_PX}`

  return (
    <polygon
      id={id}
      points={points}
      fill={theme.gray900}
      stroke={theme.white}
      strokeWidth={MATCH_MARK_OUTLINE_WIDTH}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Tooltip target={id} isOpen={isHovered} fullWidth>
        <div>
          <b>{pattern.name}</b>
        </div>
        <div>{t('Private mutation relative to parent (nearest node on the reference tree)')}</div>
        <TooltipBadgeGrid>
          <MutationPatternEventBadge event={event} />
        </TooltipBadgeGrid>
        {event.motifMatches.map((motifMatch) => (
          <div key={`${motifMatch.motif}_${motifMatch.start}`}>
            {t('Motif {{motif}} at {{start}}-{{end}}', {
              motif: motifMatch.motif,
              start: motifMatch.start + 1,
              end: motifMatch.end,
            })}
          </div>
        ))}
        {pattern.description && <TooltipNote>{pattern.description}</TooltipNote>}
      </Tooltip>
    </polygon>
  )
}

export const SequenceMarkerPatternMatch = React.memo(SequenceMarkerPatternMatchUnmemoed)

export interface SequenceMarkerClusterProps extends PatternMarkerProps, SVGProps<SVGRectElement> {
  cluster: MutationPatternCluster
}

/** Dark hollow frame around the matched mutations of one cluster */
function SequenceMarkerClusterUnmemoed({
  index,
  seqName,
  pattern,
  cluster,
  lane,
  laneCount,
  pixelsPerBase,
  ...rest
}: SequenceMarkerClusterProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const laneDims = usePatternLane(lane, laneCount)
  const { isHovered, onMouseEnter, onMouseLeave } = usePatternHover(pattern.id)

  if (!laneDims) {
    return null
  }

  // Inset by half a stroke, so that frames in neighboring lanes do not overlap
  const y = laneDims.y + CLUSTER_FRAME_STROKE_WIDTH / 2
  const height = laneDims.height - CLUSTER_FRAME_STROKE_WIDTH

  const { start, end, count, events } = cluster

  // Several patterns can have a cluster with the same range
  const id = getSafeId('cluster-marker', { index, seqName, patternId: pattern.id, begin: start, end })

  // `end` is inclusive: the cluster covers the half-open range `[start, end + 1)`
  let width = (end + 1 - start) * pixelsPerBase
  width = Math.max(width, BASE_MIN_WIDTH_PX)
  const halfNuc = Math.max(pixelsPerBase, BASE_MIN_WIDTH_PX) / 2 // Anchor on the center of the first nuc
  const x = start * pixelsPerBase - halfNuc - CLUSTER_FRAME_PADDING_PX
  width += 2 * CLUSTER_FRAME_PADDING_PX

  return (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <rect
        fill="none"
        stroke={theme.gray900}
        strokeWidth={CLUSTER_FRAME_STROKE_WIDTH}
        strokeDasharray={CLUSTER_FRAME_DASHES[lane % CLUSTER_FRAME_DASHES.length]}
        pointerEvents="none"
        x={x}
        y={y}
        width={width}
        height={height}
        rx={1}
        {...rest}
      />
      <rect
        id={id}
        fill="none"
        stroke="transparent"
        strokeWidth={CLUSTER_HOVER_STROKE_WIDTH}
        pointerEvents="stroke"
        x={x}
        y={y}
        width={width}
        height={height}
      />
      <Tooltip target={id} isOpen={isHovered} fullWidth>
        <div>
          <b>{pattern.name}</b>
        </div>
        <div>
          <b>
            {t('Cluster: {{start}}-{{end}} ({{count}} mutations)', {
              start: start + 1,
              end: end + 1,
              count,
            })}
          </b>
        </div>
        <div>{t('Private mutations relative to parent (nearest node on the reference tree)')}</div>
        {events.length > 0 && <ListOfMutationsGeneric substitutions={events} />}
        {pattern.description && <TooltipNote>{pattern.description}</TooltipNote>}
      </Tooltip>
    </g>
  )
}

export const SequenceMarkerCluster = React.memo(SequenceMarkerClusterUnmemoed)

export interface SequenceMarkerMutationPatternsProps {
  index: number
  seqName: string
  mutationPatterns?: MutationPatternsResults
  pixelsPerBase: number
}

/** Number of cluster markers of all mutation patterns, which count toward the marker limit like other markers. Match
 * markers are not counted: each one marks a mutation marker that is already counted */
export function countMutationPatternClusters(mutationPatterns?: MutationPatternsResults): number {
  return (mutationPatterns?.results ?? []).reduce((total, pattern) => total + pattern.clusters.length, 0)
}

/** Positions of the mutations matched by the focused mutation pattern, or `undefined` when no pattern is in focus or
 * patterns are not shown */
export function useFocusedPatternPositions(mutationPatterns?: MutationPatternsResults): Set<number> | undefined {
  const focusedPatternId = useRecoilValue(focusedMutationPatternIdAtom)
  return useMemo(() => {
    if (focusedPatternId === undefined || !mutationPatterns) {
      return undefined
    }
    const pattern = (mutationPatterns.results ?? []).find((pattern) => pattern.id === focusedPatternId)
    return new Set((pattern?.matches ?? []).map((event) => event.pos))
  }, [focusedPatternId, mutationPatterns])
}

/** Markers of all mutation patterns, one lane per pattern: a triangle per matched mutation and a frame per cluster */
export function SequenceMarkerMutationPatterns({
  index,
  seqName,
  mutationPatterns,
  pixelsPerBase,
}: SequenceMarkerMutationPatternsProps) {
  const focusedPatternId = useRecoilValue(focusedMutationPatternIdAtom)
  const patterns = mutationPatterns?.results ?? []
  return (
    <>
      {patterns.map((pattern, lane) => {
        const markerProps = { index, seqName, pattern, lane, laneCount: patterns.length, pixelsPerBase }
        const isUnfocused = focusedPatternId !== undefined && focusedPatternId !== pattern.id
        return (
          <g key={pattern.id} opacity={isUnfocused ? UNFOCUSED_MARKER_OPACITY : undefined}>
            {pattern.clusters.map((cluster) => (
              <SequenceMarkerCluster key={`cluster_${cluster.start}_${cluster.end}`} cluster={cluster} {...markerProps} />
            ))}
            {pattern.matches.map((event) => (
              <SequenceMarkerPatternMatch key={mutationPatternEventKey(event)} event={event} {...markerProps} />
            ))}
          </g>
        )
      })}
    </>
  )
}
