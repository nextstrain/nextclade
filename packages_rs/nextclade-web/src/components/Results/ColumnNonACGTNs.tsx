import React, { useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfNonACGTNs } from 'src/components/Results/ListOfNonACGTNs'

export interface ColumnNonACGTNsProps {
  sequence: AnalysisResult
}

export function ColumnNonACGTNs({ sequence }: ColumnNonACGTNsProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { seqName, nonACGTNs, totalNonACGTNs } = sequence
  const id = getSafeId('col-nonacgtn', { seqName })

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {totalNonACGTNs}
      <Tooltip isOpen={showTooltip} target={id}>
        <ListOfNonACGTNs nonACGTNs={nonACGTNs} totalNonACGTNs={totalNonACGTNs} />
      </Tooltip>
    </div>
  )
}
