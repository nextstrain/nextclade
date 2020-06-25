import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'

import type { AnalysisResult, MutationElementWithId } from 'src/algorithms/types'

export interface MutationTooltipProps {
  sequence: AnalysisResult
  mutation: MutationElementWithId
}

export function MutationTooltip({ mutation, sequence }: MutationTooltipProps) {
  const { allele, pos, id, seqName, aaSubstitutions } = mutation
  const positionOneBased = pos + 1 // NOTE: by convention, bases are numbered starting from 1

  const { clades } = sequence
  const cladesList = Object.keys(clades).join(', ')

  const aminoacidMutationItems = aaSubstitutions.map(({ queryAA, codon, refAA }) => {
    const notation = `${refAA}${codon}${queryAA}`
    return <li key={notation}>{notation}</li>
  })

  return (
    <Popover className="popover-mutation" target={id} placement="auto" isOpen hideArrow delay={0} fade={false}>
      <PopoverBody>
        <div>{`Sequence: ${seqName}`}</div>
        <div>{`Clades (all): ${cladesList}`}</div>
        <div>{`Position: ${positionOneBased}`}</div>
        <div>{`Allele: ${allele}`}</div>
        {aminoacidMutationItems.length > 0 && (
          <div>
            {`Aminoacid changes:`}
            <ul>{aminoacidMutationItems}</ul>
          </div>
        )}
      </PopoverBody>
    </Popover>
  )
}
