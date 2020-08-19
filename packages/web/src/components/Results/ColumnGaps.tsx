import React, { useState } from 'react'

import type { AnalysisResultState } from 'src/state/algorithm/algorithm.state'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfGaps } from 'src/components/Results/ListOfGaps'

export interface ColumnGapsProps {
  sequence: AnalysisResultState
}

export function ColumnGaps({ sequence }: ColumnGapsProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { deletions, seqName } = sequence
  const id = getSafeId('col-gaps', { seqName })

  const totalGaps = deletions.reduce((acc, curr) => acc + curr.length, 0)

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {totalGaps}
      <Tooltip id={id} isOpen={showTooltip} target={id}>
        <ListOfGaps deletions={deletions} />
      </Tooltip>
    </div>
  )
}
