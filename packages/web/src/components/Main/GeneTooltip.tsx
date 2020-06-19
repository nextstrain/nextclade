import React from 'react'

import { GeneMapDatum } from 'src/algorithms/geneMap'
import { Popover, PopoverBody } from 'reactstrap'
import { formatRange } from 'src/components/Main/formatRange'

export function getGeneId(gene: GeneMapDatum) {
  const { name, start, end } = gene
  return CSS.escape(`${name}-${start}-${end}`)
}

export interface GeneTooltipProps {
  gene: GeneMapDatum
}

export function GeneTooltip({ gene }: GeneTooltipProps) {
  const { name, color, start, end, seqid, strand, type } = gene
  const id = getGeneId(gene)

  const range = formatRange(start, end)

  return (
    <Popover className="popover-mutation" target={id} placement="auto" isOpen hideArrow delay={0} fade={false}>
      <PopoverBody>
        <div style={{ color }}>{`Name: ${name}`}</div>
        <div>{`Range: ${range}`}</div>
        <div>{`SeqId: ${seqid}`}</div>
        <div>{`Strand: ${strand}`}</div>
        <div>{`Type: ${type}`}</div>
      </PopoverBody>
    </Popover>
  )
}
