import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'

import type { MutationElementWithId } from 'src/components/Main/types'

export interface MutationTooltipProps {
  mutation: MutationElementWithId
}

export function MutationTooltip({ mutation }: MutationTooltipProps) {
  const { allele, position, id, seqName } = mutation

  return (
    <Popover className="popover-mutation" target={id} placement="auto" isOpen hideArrow delay={0} fade={false}>
      <PopoverBody>
        <div>{`Sequence ${seqName}`}</div>
        <div>{`Position ${position}`}</div>
        <div>{`Allele ${allele}`}</div>
      </PopoverBody>
    </Popover>
  )
}
