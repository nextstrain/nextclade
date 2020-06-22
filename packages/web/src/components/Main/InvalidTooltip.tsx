import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'

import type { AnalysisResult } from 'src/algorithms/types'
import type { InvalidElementWithId } from './types'

import { formatRange } from './formatRange'

export interface InvalidTooltipProps {
  sequence: AnalysisResult
  inv: InvalidElementWithId
}

export function InvalidTooltip({ inv, sequence }: InvalidTooltipProps) {
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
