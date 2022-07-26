import React, { useCallback, useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfMissing } from 'src/components/Results/ListOfMissing'

export interface ColumnMissingProps {
  analysisResult: AnalysisResult
}

export function ColumnMissing({ analysisResult }: ColumnMissingProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, missing, seqName, totalMissing } = analysisResult
  const id = getSafeId('col-missing', { index, seqName })

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {totalMissing}
      <Tooltip isOpen={showTooltip} target={id}>
        <ListOfMissing missing={missing} totalMissing={totalMissing} />
      </Tooltip>
    </div>
  )
}
