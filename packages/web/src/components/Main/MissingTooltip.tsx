import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'

import type { AnalysisResult } from 'src/algorithms/types'
import type { MissingElementWithId } from './types'

import { formatRange } from './formatRange'

export interface MissingTooltipProps {
  sequence: AnalysisResult
  inv: MissingElementWithId
}

export function MissingTooltip({ inv, sequence }: MissingTooltipProps) {
  const { id, seqName, character, begin, end } = inv
  const rangeStr = formatRange(begin, end)

  const { clades } = sequence
  const cladesList = Object.keys(clades).join(', ')

  return (
    <Popover className="popover-mutation" target={id} placement="auto" isOpen hideArrow delay={0} fade={false}>
      <PopoverBody>
        <div>{`Sequence ${seqName}`}</div>
        <div>{`Clades ${cladesList}`}</div>
        <div>{`Position ${rangeStr}`}</div>
        <div>{`Character ${character}`}</div>
      </PopoverBody>
    </Popover>
  )
}
