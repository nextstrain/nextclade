import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import styled, { useTheme } from 'styled-components'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'

import { Tooltip } from 'src/components/Results/Tooltip'
import { MutationPatternEventBadge, mutationPatternEventKey } from 'src/components/Common/MutationPatternEventBadge'
import { BASE_MIN_WIDTH_PX } from 'src/constants'
import { getSafeId } from 'src/helpers/getSafeId'
import {
  SeqMarkerHeightState,
  getSeqMarkerDims,
  seqMarkerClusterHeightStateAtom,
} from 'src/state/seqViewSettings.state'
import type { MutationPatternEventMatch, MutationPatternsResults } from 'src/gen/_SchemaRoot'

// The frame is hollow and dark, so that it stands out from mutation markers of any nucleotide color and leaves them
// visible inside
const CLUSTER_FRAME_STROKE_WIDTH = 1.5
const CLUSTER_FRAME_PADDING_PX = 3
// Dash pattern per lane, so that clusters of different patterns differ without relying on color
const CLUSTER_FRAME_DASHES = [undefined, '3 2', '1 2']
// Width of the invisible band along the frame that opens the tooltip. The inside stays free, so that the mutation
// markers inside the cluster keep their own tooltips
const CLUSTER_HOVER_STROKE_WIDTH = 6

const ClusterBadgeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 4px;
`

const ClusterDescription = styled.div`
  margin-top: 4px;
  font-size: 0.85em;
  color: ${(props) => props.theme.gray600};
`

interface ClusterProps {
  start: number
  end: number
  count: number
  events: MutationPatternEventMatch[]
}

export interface SequenceMarkerClusterProps extends SVGProps<SVGRectElement> {
  index: number
  seqName: string
  patternId: string
  patternName: string
  cluster: ClusterProps
  /** Vertical lane of this pattern inside the cluster marker band */
  lane: number
  /** Number of lanes: one per configured pattern, so that clusters of different patterns never cover each other */
  laneCount: number
  pixelsPerBase: number
  description?: string
}

function SequenceMarkerClusterUnmemoed({
  index,
  seqName,
  patternId,
  patternName,
  cluster,
  lane,
  laneCount,
  pixelsPerBase,
  description,
  ...rest
}: SequenceMarkerClusterProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const seqMarkerClusterHeightState = useRecoilValue(seqMarkerClusterHeightStateAtom)
  const { y, height } = useMemo(() => {
    const band = getSeqMarkerDims(seqMarkerClusterHeightState)
    const laneHeight = band.height / Math.max(laneCount, 1)
    // Inset by half a stroke, so that frames in neighboring lanes do not overlap
    return {
      y: band.y + lane * laneHeight + CLUSTER_FRAME_STROKE_WIDTH / 2,
      height: laneHeight - CLUSTER_FRAME_STROKE_WIDTH,
    }
  }, [seqMarkerClusterHeightState, lane, laneCount])

  if (seqMarkerClusterHeightState === SeqMarkerHeightState.Off) {
    return null
  }

  const { start, end, count, events } = cluster

  // Several patterns can have a cluster with the same range
  const id = getSafeId('cluster-marker', { index, seqName, patternId, begin: start, end })

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
      <Tooltip target={id} isOpen={showTooltip}>
        <div>
          <b>{patternName}</b>
        </div>
        <div>
          <b>
            {t('Cluster of private mutations: {{start}}-{{end}} ({{count}} mutations)', {
              start: start + 1,
              end: end + 1,
              count,
            })}
          </b>
        </div>
        {events.length > 0 && (
          <ClusterBadgeGrid>
            {events.map((event) => (
              <MutationPatternEventBadge key={mutationPatternEventKey(event)} event={event} />
            ))}
          </ClusterBadgeGrid>
        )}
        {description && <ClusterDescription>{description}</ClusterDescription>}
      </Tooltip>
    </g>
  )
}

export const SequenceMarkerCluster = React.memo(SequenceMarkerClusterUnmemoed)

export interface SequenceMarkerMutationPatternClustersProps {
  index: number
  seqName: string
  mutationPatterns?: MutationPatternsResults
  pixelsPerBase: number
}

/** Number of cluster markers of all mutation patterns, which count toward the marker limit like other markers */
export function countMutationPatternClusters(mutationPatterns?: MutationPatternsResults): number {
  return (mutationPatterns?.results ?? []).reduce((total, pattern) => total + pattern.clusters.length, 0)
}

/** Markers for the clusters of all mutation patterns, drawn in one lane per pattern */
export function SequenceMarkerMutationPatternClusters({
  index,
  seqName,
  mutationPatterns,
  pixelsPerBase,
}: SequenceMarkerMutationPatternClustersProps) {
  const patterns = mutationPatterns?.results ?? []
  return (
    <>
      {patterns.flatMap((pattern, lane) =>
        pattern.clusters.map((cluster) => (
          <SequenceMarkerCluster
            key={`cluster_${pattern.id}_${cluster.start}_${cluster.end}`}
            index={index}
            seqName={seqName}
            patternId={pattern.id}
            patternName={pattern.name}
            cluster={cluster}
            lane={lane}
            laneCount={patterns.length}
            pixelsPerBase={pixelsPerBase}
            description={pattern.description}
          />
        )),
      )}
    </>
  )
}
