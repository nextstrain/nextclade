import React, { useCallback, useState } from 'react'

import { getSafeId } from 'src/helpers/getSafeId'
import type { AnalysisResult } from 'src/types'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfStopCodons } from 'src/components/Results/ListOfStopCodons'

export interface ColumnStopCodonsProps {
  analysisResult: AnalysisResult
}

export function ColumnStopCodons({ analysisResult }: ColumnStopCodonsProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const {
    index,
    seqName,
    qc: { stopCodons },
  } = analysisResult

  if (!stopCodons) {
    return null
  }

  const id = getSafeId('stop-codons-label', { index, seqName })

  const { totalStopCodons, totalStopCodonsIgnored } = stopCodons
  const grandTotal = totalStopCodons + totalStopCodonsIgnored
  const shouldShowTooltip = grandTotal > 0
  const value = grandTotal === 0 ? 0 : `${totalStopCodons} (${grandTotal})`

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {value}
      <Tooltip isOpen={shouldShowTooltip && showTooltip} target={id} wide fullWidth>
        <ListOfStopCodons stopCodons={stopCodons} />
      </Tooltip>
    </div>
  )
}
