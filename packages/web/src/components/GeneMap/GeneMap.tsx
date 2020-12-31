import React, { SVGProps, useState } from 'react'

import { connect } from 'react-redux'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { selectParams } from 'src/state/algorithm/algorithm.selectors'
import styled from 'styled-components'

import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { Gene, Virus } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { Tooltip } from 'src/components/Results/Tooltip'
import { formatRange } from 'src/helpers/formatRange'
import { getSafeId } from 'src/helpers/getSafeId'

export const GENE_MAP_HEIGHT_PX = 35
export const GENE_HEIGHT_PX = 15
export const geneMapY = -GENE_MAP_HEIGHT_PX / 2

export const GeneMapWrapper = styled.div`
  display: flex;
  width: 100%;
  height: ${GENE_MAP_HEIGHT_PX}px;
  padding: 0;
  margin: 0 auto;
`

export const GeneMapSVG = styled.svg`
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0 auto;
`

export interface GeneViewProps extends SVGProps<SVGRectElement> {
  gene: Gene
  pixelsPerBase: number
}

export function GeneView({ gene, pixelsPerBase, ...rest }: GeneViewProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const { name, color, range: { begin, end }, frame } = gene // prettier-ignore
  const width = Math.max(BASE_MIN_WIDTH_PX, (end - begin) * pixelsPerBase)
  const x = begin * pixelsPerBase
  const id = getSafeId('gene', { ...gene })
  const range = formatRange(begin, end)

  return (
    <rect
      id={id}
      fill={gene.color}
      x={x}
      y={-10 + 7.5 * frame}
      width={width}
      height={GENE_HEIGHT_PX}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      {...rest}
    >
      <Tooltip target={id} isOpen={showTooltip}>
        <div style={{ color }}>{`${name} (${range})`}</div>
      </Tooltip>
    </rect>
  )
}

export interface GeneMapProps extends ReactResizeDetectorDimensions {
  virus: Virus
}

const mapStateToProps = (state: State) => ({
  virus: selectParams(state).virus,
})

const mapDispatchToProps = {}

export const GeneMapUnsized = connect(mapStateToProps, mapDispatchToProps)(GeneMapUnsizedDisconnected)

export function GeneMapUnsizedDisconnected({ virus, width, height }: GeneMapProps) {
  if (!width || !height) {
    return (
      <GeneMapWrapper>
        <GeneMapSVG viewBox={`0 -25 50 50`} />
      </GeneMapWrapper>
    )
  }

  const { geneMap, genomeSize } = virus
  const pixelsPerBase = width / genomeSize
  const geneViews = geneMap.map((gene, i) => {
    return <GeneView key={gene.name} gene={gene} pixelsPerBase={pixelsPerBase} />
  })

  return (
    <GeneMapWrapper>
      <GeneMapSVG viewBox={`0 ${geneMapY} ${width} ${GENE_MAP_HEIGHT_PX}`}>
        <rect fill="transparent" x={0} y={geneMapY} width={width} height={GENE_MAP_HEIGHT_PX} />
        {geneViews}
      </GeneMapSVG>
    </GeneMapWrapper>
  )
}

export const GeneMap = withResizeDetector(GeneMapUnsized, {
  handleWidth: true,
  handleHeight: true,
  refreshRate: 300,
  refreshMode: 'debounce',
})
