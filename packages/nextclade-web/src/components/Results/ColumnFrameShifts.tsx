import React, { useCallback, useState } from 'react'

import { getSafeId } from 'src/helpers/getSafeId'
import { ColumnCladeProps } from 'src/components/Results/ColumnClade'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfFrameShifts } from 'src/components/Results/ListOfFrameShifts'

export function ColumnFrameShifts({ analysisResult }: ColumnCladeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, seqName, qc } = analysisResult

  if (!qc.frameShifts) {
    return null
  }

  const id = getSafeId('frame-shifts-label', { index, seqName })

  const { totalFrameShifts, totalFrameShiftsIgnored } = qc.frameShifts
  const grandTotal = totalFrameShiftsIgnored + totalFrameShifts
  const shouldShowTooltip = grandTotal > 0
  const value = grandTotal === 0 ? 0 : `${totalFrameShifts} (${grandTotal})`

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {value}
      <Tooltip isOpen={shouldShowTooltip && showTooltip} target={id} wide fullWidth>
        <ListOfFrameShifts frameShiftsResults={qc.frameShifts} />
      </Tooltip>
    </div>
  )
}
