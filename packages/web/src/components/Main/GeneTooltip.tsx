import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'
import { formatRange } from 'src/components/Main/formatRange'
import { Gene } from 'src/algorithms/types'

export function getGeneId(gene: Gene) {
  const {
    name,
    range: { begin, end },
  } = gene
  return CSS.escape(`${name}-${begin}-${end}`)
}

export interface GeneTooltipProps {
  gene: Gene
}

export function GeneTooltip({ gene }: GeneTooltipProps) {
  const {
    name,
    color,
    range: { begin, end },
  } = gene
  const id = getGeneId(gene)

  const range = formatRange(begin, end)

  return (
    <Popover className="popover-mutation" target={id} placement="auto" isOpen hideArrow delay={0} fade={false}>
      <PopoverBody>
        <div style={{ color }}>{`${name} (${range})`}</div>
      </PopoverBody>
    </Popover>
  )
}
