import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'

import type { AnalysisResult, MutationElementWithId } from 'src/algorithms/types'
import { formatMutation } from 'src/helpers/formatMutation'

export interface MutationTooltipProps {
  sequence: AnalysisResult
  mutation: MutationElementWithId
}

export function SequenceMarkerMutationTooltip({ mutation, sequence }: MutationTooltipProps) {
  const { queryNuc, refNuc, pos, id, seqName, aaSubstitutions } = mutation

  const { clades } = sequence
  const cladesList = Object.keys(clades).join(', ')

  const aminoacidMutationItems = aaSubstitutions.map(({ queryAA, codon, refAA, gene }) => {
    const notation = `${gene}: ${refAA}${codon + 1}${queryAA}`
    return <li key={notation}>{notation}</li>
  })

  const mut = formatMutation({ pos, queryNuc, refNuc })

  return (
    <Popover className="popover-mutation" target={id} placement="auto" isOpen hideArrow delay={0} fade={false}>
      <PopoverBody>
        <div>{`Sequence: ${seqName}`}</div>
        <div>{`Clades (all): ${cladesList}`}</div>
        <div>{`Nucleotide mutation:`}</div>
        <div>{mut}</div>
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
