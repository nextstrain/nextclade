import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'

import type { MutationElementWithId } from 'src/components/Main/types'

export interface MutationTooltipProps {
  mutation: MutationElementWithId
}

export function MutationTooltip({ mutation }: MutationTooltipProps) {
  const { allele, positionZeroBased, id, seqName } = mutation
  const positionOneBased = positionZeroBased + 1 // NOTE: by convention, bases are numbered starting from 1

  return (
    <Popover className="popover-mutation" target={id} placement="auto" isOpen hideArrow delay={0} fade={false}>
      <PopoverBody>
        <div>{`Sequence ${seqName}`}</div>
        <div>{`Position ${positionOneBased}`}</div>
        <div>{`Allele ${allele}`}</div>
      </PopoverBody>
    </Popover>
  )
}
