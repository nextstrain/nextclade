import React, { SVGProps, useState } from 'react'

import { connect } from 'react-redux'
import { ReactResizeDetectorDimensions, withResizeDetector } from 'react-resize-detector'
import { selectGeneMap, selectGenomeSize } from 'src/state/algorithm/algorithm.selectors'
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
  const { geneName, color, start, end, length, frame } = gene // prettier-ignore
  const width = Math.max(BASE_MIN_WIDTH_PX, length * pixelsPerBase)
  const x = start * pixelsPerBase
  const id = getSafeId('gene', { ...gene })
  const range = formatRange(start, end)

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
        <div style={{ color }}>{`${geneName} (${range})`}</div>
      </Tooltip>
    </rect>
  )
}

export interface GeneMapProps extends ReactResizeDetectorDimensions {
  // virus: Virus
  geneMap?: Gene[]
  genomeSize?: number
}

const mapStateToProps = (state: State) => ({
  // virus: selectParams(state).virus,
  geneMap: selectGeneMap(state),
  genomeSize: selectGenomeSize(state),
})

const mapDispatchToProps = {}

export const GeneMapUnsized = connect(mapStateToProps, mapDispatchToProps)(GeneMapUnsizedDisconnected)

export function GeneMapUnsizedDisconnected({ geneMap, genomeSize, width, height }: GeneMapProps) {
  if (!width || !height || !geneMap || !genomeSize) {
    return (
      <GeneMapWrapper>
        <GeneMapSVG viewBox={`0 -25 50 50`} />
      </GeneMapWrapper>
    )
  }

  const pixelsPerBase = width / genomeSize
  const geneViews = geneMap.map((gene, i) => {
    return <GeneView key={gene.geneName} gene={gene} pixelsPerBase={pixelsPerBase} />
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
