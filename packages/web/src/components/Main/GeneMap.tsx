import React, { SVGProps, useState } from 'react'

import ReactResizeDetector from 'react-resize-detector'

import { BASE_MIN_WIDTH_PX, GENOME_SIZE } from 'src/components/Main/SequenceView'
import { GeneMapDatum, geneMap } from 'src/algorithms/geneMap'
import { GeneTooltip } from './GeneTooltip'

export interface GeneViewProps extends SVGProps<SVGRectElement> {
  gene: GeneMapDatum
  pixelsPerBase: number
}

export function getGeneId(gene: GeneMapDatum) {
  const { name, start, end } = gene
  return CSS.escape(`${name}-${start}-${end}`)
}

export function GeneView({ gene, pixelsPerBase, ...rest }: GeneViewProps) {
  const { end, start } = gene
  const width = Math.max(BASE_MIN_WIDTH_PX, (end - start) * pixelsPerBase)
  const x = start * pixelsPerBase
  const id = getGeneId(gene)
  return <rect id={id} fill={gene.color} x={x} y={-10} width={width} height="30" {...rest} />
}

export function GeneMap() {
  const [currGene, setCurrGene] = useState<GeneMapDatum | undefined>(undefined)

  return (
    <ReactResizeDetector handleWidth refreshRate={300} refreshMode="debounce">
      {({ width: widthPx }: { width?: number }) => {
        if (!widthPx) {
          return <div className="w-100 h-100" />
        }

        const pixelsPerBase = widthPx / GENOME_SIZE
        const geneViews = geneMap.map((gene) => (
          <GeneView
            key={gene.name}
            gene={gene}
            pixelsPerBase={pixelsPerBase}
            onMouseEnter={() => setCurrGene(gene)}
            onMouseLeave={() => setCurrGene(undefined)}
          />
        ))

        return (
          <div className="gene-map-wrapper d-inline-flex">
            <svg className="gene-map-body" viewBox={`0 0 ${widthPx} 10`}>
              <rect className="gene-map-background" x={0} y={-10} width={GENOME_SIZE} height="30" />
              {geneViews}
            </svg>
            {currGene && <GeneTooltip gene={currGene} />}
          </div>
        )
      }}
    </ReactResizeDetector>
  )
}
