import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'

import type { AnalysisResult, MutationElementWithId } from 'src/algorithms/types'

export interface MutationTooltipProps {
  sequence: AnalysisResult
  mutation: MutationElementWithId
}

export function MutationTooltip({ mutation, sequence }: MutationTooltipProps) {
  const { allele, pos, id, seqName } = mutation
  const positionOneBased = pos + 1 // NOTE: by convention, bases are numbered starting from 1

  const { clades } = sequence
  const cladesList = Object.keys(clades).join(', ')

  return (
    <Popover className="popover-mutation" target={id} placement="auto" isOpen hideArrow delay={0} fade={false}>
      <PopoverBody>
        <div>{`Sequence: ${seqName}`}</div>
        <div>{`Clades (all): ${cladesList}`}</div>
        <div>{`Position: ${positionOneBased}`}</div>
        <div>{`Allele: ${allele}`}</div>
      </PopoverBody>
    </Popover>
  )
}
