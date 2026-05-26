import React, { SVGProps, useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'

import { Tooltip } from 'src/components/Results/Tooltip'
import { NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { getSafeId } from 'src/helpers/getSafeId'
import {
  SeqMarkerHeightState,
  getSeqMarkerDims,
  seqMarkerClusterHeightStateAtom,
} from 'src/state/seqViewSettings.state'
import type { MutationPatternEventMatch } from 'src/gen/_SchemaRoot'

const CLUSTER_FILL = 'rgba(255, 140, 0, 0.12)'
const CLUSTER_STROKE = '#e06000'
const CLUSTER_MIN_WIDTH_PX = 12

const ClusterBadgeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 4px;
`

const ClusterDescription = styled.div`
  margin-top: 4px;
  font-size: 0.85em;
  color: #666;
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
  cluster: ClusterProps
  pixelsPerBase: number
  description?: string
}

function SequenceMarkerClusterUnmemoed({
  index,
  seqName,
  cluster,
  pixelsPerBase,
  description,
  ...rest
}: SequenceMarkerClusterProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const seqMarkerClusterHeightState = useRecoilValue(seqMarkerClusterHeightStateAtom)
  const { y, height } = useMemo(() => getSeqMarkerDims(seqMarkerClusterHeightState), [seqMarkerClusterHeightState])

  if (seqMarkerClusterHeightState === SeqMarkerHeightState.Off) {
    return null
  }

  const { start, end, count, events } = cluster

  const id = getSafeId('cluster-marker', { index, seqName, begin: start, end })

  let width = (end - start + 1) * pixelsPerBase
  width = Math.max(width, CLUSTER_MIN_WIDTH_PX)
  const halfNuc = Math.max(pixelsPerBase, CLUSTER_MIN_WIDTH_PX) / 2
  const x = start * pixelsPerBase - halfNuc

  return (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <rect
        id={id}
        fill={CLUSTER_FILL}
        stroke={CLUSTER_STROKE}
        strokeWidth={1}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={1}
        {...rest}
      />
      <Tooltip target={id} isOpen={showTooltip}>
        <div>
          <b>
            {t('Mutation cluster: {{start}}-{{end}} ({{count}} events)', {
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

function MutationPatternEventBadge({ event }: { event: MutationPatternEventMatch }) {
  switch (event.type) {
    case 'nucSubstitution':
      return <NucleotideMutationBadge mutation={event} />
  }
}

function mutationPatternEventKey(event: MutationPatternEventMatch): string {
  switch (event.type) {
    case 'nucSubstitution':
      return `${event.type}:${event.pos}:${event.refNuc}:${event.qryNuc}`
  }
  throw new Error(`Unknown mutation pattern event type: ${event.type}`)
}
