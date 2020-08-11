import React, { useState } from 'react'

import { MdCheck, MdClear } from 'react-icons/md'

import type { AnalysisResult } from 'src/algorithms/types'
import type { QCResult } from 'src/algorithms/QC/runQC'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfQcIssues } from 'src/components/Results/ListOfQcIsuues'

export interface ColumnQCStatusProps {
  sequence: AnalysisResult
  qc: QCResult
}

export function ColumnQCStatus({ sequence, qc }: ColumnQCStatusProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { seqName } = sequence
  const id = getSafeId('qc-label', { seqName })

  const { score } = qc
  const hasIssues = score > 0
  const iconRed = <MdClear className="icon fill-red" />
  const iconGreen = <MdCheck className="icon fill-green" />

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {hasIssues ? iconRed : iconGreen}
      <Tooltip target={id} isOpen={showTooltip}>
        <ListOfQcIssues qc={qc} />
      </Tooltip>
    </div>
  )
}
