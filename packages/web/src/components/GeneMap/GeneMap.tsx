import React, { SVGProps, useState } from 'react'

import { Popover, PopoverBody } from 'reactstrap'
import ReactResizeDetector from 'react-resize-detector'

import { BASE_MIN_WIDTH_PX } from 'src/constants'
import { getSafeId } from 'src/helpers/getSafeId'

import type { Gene, Nucleotide } from 'src/algorithms/types'
import { geneMap } from 'src/algorithms/geneMap'
import { VIRUSES } from 'src/algorithms/viruses'

import { GENOME_SIZE } from '../SequenceView/SequenceView'
import { GeneTooltip, getGeneId } from './GeneTooltip'

const GENE_MAP_CLADE_MARK_COLOR = '#444444aa' as const

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

export interface CladeMarkProps extends SVGProps<SVGRectElement> {
  id: string
  pos: number
  pixelsPerBase: number
}

export function CladeMark({ id, pos, pixelsPerBase, ...rest }: CladeMarkProps) {
  const fill = GENE_MAP_CLADE_MARK_COLOR
  const x = pos * pixelsPerBase
  const width = Math.max(BASE_MIN_WIDTH_PX, 1 * pixelsPerBase)
  return <rect id={id} fill={fill} x={x} y={-10} width={width} height="30" {...rest} />
}

interface CladeMark {
  id: string
  pos: number
  cladeName: string
  nuc: Nucleotide
}

export interface CladeMarkTooltipProps {
  cladeMark: CladeMark
}

export function CladeMarkTooltip({ cladeMark }: CladeMarkTooltipProps) {
  const { id, pos, nuc, cladeName } = cladeMark

  return (
    <Popover className="popover-mutation" target={id} placement="auto" isOpen hideArrow delay={0} fade={false}>
      <PopoverBody>
        <div>{`Clade: ${cladeName} `}</div>
        <div>{`Position: ${pos} `}</div>
        <div>{`Nucleotide: ${nuc} `}</div>
      </PopoverBody>
    </Popover>
  )
}

export function GeneMap() {
  const [currGene, setCurrGene] = useState<Gene | undefined>(undefined)
  const [currCladeMark, setCurrCladeMark] = useState<CladeMark | undefined>(undefined)
  const { clades } = VIRUSES['SARS-CoV-2']

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

        // TODO: move to algorithms
        const cladeSubstitutions = Object.entries(clades).reduce((result, clade) => {
          const [cladeName, substitutions] = clade

          const marks: CladeMark[] = substitutions.map((substitution) => {
            const id = getSafeId('clade-mark', { cladeName, ...substitution })
            const { pos, nuc } = substitution
            return { id, cladeName, pos, nuc }
          })

          return [...result, ...marks]
        }, [] as CladeMark[])

        const cladeMarks = cladeSubstitutions.map((cladeSubstitution) => {
          const { id, pos } = cladeSubstitution
          return (
            <CladeMark
              key={id}
              id={id}
              pos={pos}
              pixelsPerBase={pixelsPerBase}
              onMouseEnter={() => setCurrCladeMark(cladeSubstitution)}
              onMouseLeave={() => setCurrCladeMark(undefined)}
            />
          )
        })

        return (
          <div className="gene-map-wrapper d-inline-flex">
            <svg className="gene-map-body" viewBox={`0 0 ${widthPx} 10`}>
              <rect className="gene-map-background" x={0} y={-10} width={GENOME_SIZE} height="30" />
              {geneViews}
              {cladeMarks}
            </svg>
            {currGene && <GeneTooltip gene={currGene} />}
            {currCladeMark && <CladeMarkTooltip cladeMark={currCladeMark} />}
          </div>
        )
      }}
    </ReactResizeDetector>
  )
}
