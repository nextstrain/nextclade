import React, { useCallback, useState } from 'react'

import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfNonACGTNs } from 'src/components/Results/ListOfNonACGTNs'

export interface ColumnNonACGTNsProps {
  analysisResult: AnalysisResult
}

export function ColumnNonACGTNs({ analysisResult }: ColumnNonACGTNsProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, seqName, nonACGTNs, totalNonACGTNs } = analysisResult
  const id = getSafeId('col-nonacgtn', { index, seqName })

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {totalNonACGTNs}
      <Tooltip isOpen={showTooltip} target={id}>
        <ListOfNonACGTNs nonACGTNs={nonACGTNs} totalNonACGTNs={totalNonACGTNs} />
      </Tooltip>
    </div>
  )
}
