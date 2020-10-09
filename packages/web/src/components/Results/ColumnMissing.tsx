import React, { useState } from 'react'
import { getSafeId } from 'src/helpers/getSafeId'

import type { AnalysisResult } from 'src/algorithms/types'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfMissing } from 'src/components/Results/ListOfMissing'

export interface ColumnMissingProps {
  sequence: AnalysisResult
}

export function ColumnMissing({ sequence }: ColumnMissingProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { missing, seqName, totalMissing } = sequence
  const id = getSafeId('col-missing', { seqName })

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {totalMissing}
      <Tooltip isOpen={showTooltip} target={id}>
        <ListOfMissing missing={missing} totalMissing={totalMissing} />
      </Tooltip>
    </div>
  )
}
