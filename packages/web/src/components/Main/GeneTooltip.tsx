import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'
import { formatRange } from 'src/components/Main/formatRange'
import { Gene } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'

export const getGeneId = (gene: Gene) => getSafeId('gene', (gene as unknown) as Record<string, unknown>)

export interface GeneTooltipProps {
  gene: Gene
}

export function GeneTooltip({ gene }: GeneTooltipProps) {
  const { name, color, range: { begin, end } } = gene // prettier-ignore
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
