import React, { useState } from 'react'

import { MdCheck, MdClear } from 'react-icons/md'

import { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfQcIssues } from 'src/components/Results/ListOfQcIsuues'

export interface ColumnQCStatusProps {
  sequence: AnalysisResult
}

export function ColumnQCStatus({ sequence }: ColumnQCStatusProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { seqName, diagnostics } = sequence
  const id = getSafeId('qc-label', { seqName })

  const { score } = diagnostics
  const hasIssues = score > 0
  const iconRed = <MdClear className="icon fill-red" />
  const iconGreen = <MdCheck className="icon fill-green" />

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {hasIssues ? iconRed : iconGreen}
      <Tooltip target={id} isOpen={showTooltip}>
        <ListOfQcIssues diagnostics={diagnostics} />
      </Tooltip>
    </div>
  )
}
