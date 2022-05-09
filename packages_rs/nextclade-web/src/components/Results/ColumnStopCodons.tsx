import React, { useState } from 'react'

import { getSafeId } from 'src/helpers/getSafeId'
import { ColumnCladeProps } from 'src/components/Results/ColumnClade'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfStopCodons } from 'src/components/Results/ListOfStopCodons'

export function ColumnStopCodons({ analysisResult }: ColumnCladeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { seqName } = analysisResult

  if (!analysisResult.qc.stopCodons) {
    return null
  }

  const id = getSafeId('stop-codons-label', { seqName })

  const { totalStopCodons, totalStopCodonsIgnored } = analysisResult.qc.stopCodons
  const grandTotal = totalStopCodons + totalStopCodonsIgnored
  const shouldShowTooltip = grandTotal > 0
  const value = grandTotal === 0 ? 0 : `${totalStopCodons} (${grandTotal})`

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {value}
      <Tooltip isOpen={shouldShowTooltip && showTooltip} target={id} wide fullWidth>
        <ListOfStopCodons stopCodons={analysisResult.qc.stopCodons} />
      </Tooltip>
    </div>
  )
}
