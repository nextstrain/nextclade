import React, { SVGProps, useState } from 'react'
import ReactResizeDetector from 'react-resize-detector'

import { BASE_MIN_WIDTH_PX } from 'src/constants'

import type { Gene } from 'src/algorithms/types'
import { geneMap } from 'src/algorithms/geneMap'
import { cladesGrouped } from 'src/algorithms/clades'

import { GENOME_SIZE } from '../SequenceView/SequenceView'
import { CladeMarker } from './CladeMarker'
import { GeneTooltip, getGeneId } from './GeneTooltip'

export interface GeneViewProps extends SVGProps<SVGRectElement> {
  gene: Gene
  pixelsPerBase: number
}

export function GeneView({ gene, pixelsPerBase, ...rest }: GeneViewProps) {
  const { range: { begin, end } } = gene // prettier-ignore
  const frame = begin % 3
  const width = Math.max(BASE_MIN_WIDTH_PX, (end - begin) * pixelsPerBase)
  const x = begin * pixelsPerBase
  const id = getGeneId(gene)
  return <rect id={id} fill={gene.color} x={x} y={-10 + 7.5 * frame} width={width} height="15" {...rest} />
}

export function GeneMap() {
  const [currGene, setCurrGene] = useState<Gene | undefined>(undefined)

  return (
    <ReactResizeDetector handleWidth refreshRate={300} refreshMode="debounce">
      {({ width: widthPx }: { width?: number }) => {
        if (!widthPx) {
          return <div className="w-100 h-100" />
        }

        const pixelsPerBase = widthPx / GENOME_SIZE
        const geneViews = geneMap.map((gene, i) => {
          return (
            <GeneView
              key={gene.name}
              gene={gene}
              pixelsPerBase={pixelsPerBase}
              onMouseEnter={() => setCurrGene(gene)}
              onMouseLeave={() => setCurrGene(undefined)}
            />
          )
        })

        const cladeMarks = cladesGrouped.map((cladeDatum) => {
          return <CladeMarker key={cladeDatum.pos} cladeDatum={cladeDatum} pixelsPerBase={pixelsPerBase} />
        })

        return (
          <div className="gene-map-wrapper d-inline-flex">
            <svg className="gene-map-body" viewBox={`0 0 ${widthPx} 10`}>
              <rect className="gene-map-background" x={0} y={-10} width={GENOME_SIZE} height="30" />
              {geneViews}
              {cladeMarks}
            </svg>
            {currGene && <GeneTooltip gene={currGene} />}
          </div>
        )
      }}
    </ReactResizeDetector>
  )
}
