import React, { useState } from 'react'

import { MdCheck, MdClear } from 'react-icons/md'

import { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { ColumnSequenceNameTooltip } from 'src/components/Results/ColumnSequenceNameTooltip'

export interface ColumnQCStatusProps {
  sequence: AnalysisResult
}

export function ColumnQCStatus({ sequence }: ColumnQCStatusProps) {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const { seqName, diagnostics } = sequence
  const id = getSafeId('qc-label', { seqName })

  return (
    <>
      <td
        id={id}
        className="results-table-col results-table-col-clade"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {diagnostics.flags.length > 0 ? <MdClear className="icon fill-red" /> : <MdCheck className="icon fill-green" />}
      </td>
      <ColumnSequenceNameTooltip showTooltip={showTooltip} sequence={sequence} />
    </>
  )
}
