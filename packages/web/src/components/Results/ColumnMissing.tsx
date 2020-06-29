import React, { useState } from 'react'
import { getSafeId } from 'src/helpers/getSafeId'

import type { AnalysisResult } from 'src/algorithms/types'
import { getTotalMissing } from 'src/components/Results/getTotalMissing'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfMissing } from 'src/components/Results/ListOfMissing'

export interface ColumnMissingProps {
  sequence: AnalysisResult
}

export function ColumnMissing({ sequence }: ColumnMissingProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { missing, seqName } = sequence
  const id = getSafeId('col-missing', { seqName })
  const totalNs = getTotalMissing(missing)

  return (
    <td
      id={id}
      className="results-table-col results-table-col-clade"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {totalNs}
      <Tooltip isOpen={showTooltip} target={id}>
        <ListOfMissing missing={missing} />
      </Tooltip>
    </td>
  )
}
