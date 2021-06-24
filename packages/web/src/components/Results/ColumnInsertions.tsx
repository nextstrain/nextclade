import React, { useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfInsertions } from 'src/components/Results/ListOfInsertions'

export interface ColumnInsertionsProps {
  sequence: AnalysisResult
}

export function ColumnInsertions({ sequence }: ColumnInsertionsProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { seqName, insertions, totalInsertions } = sequence
  const id = getSafeId('col-insertions', { seqName, insertions })

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {totalInsertions}
      <Tooltip id={id} isOpen={showTooltip} target={id} wide fullWidth>
        <ListOfInsertions insertions={insertions} totalInsertions={totalInsertions} />
      </Tooltip>
    </div>
  )
}
