import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'

import type { InvalidElementWithId } from 'src/components/Main/types'
import type { AnalyzeSeqResult } from 'src/algorithms/run'

export function formatRange(begin: number, end: number) {
  const beginOne = begin + 1
  const endOne = end + 1

  if (beginOne === endOne) {
    return beginOne.toString()
  }
  return `${beginOne}..${endOne}`
}

export interface InvalidTooltipProps {
  sequence: AnalyzeSeqResult
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
