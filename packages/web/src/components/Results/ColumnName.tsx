import React, { useState } from 'react'

import styled from 'styled-components'

import type { QCResult } from 'src/algorithms/QC/types'
import type { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { ColumnNameTooltip } from 'src/components/Results/ColumnNameTooltip'
import { Tooltip } from 'src/components/Results/Tooltip'

export const SequenceName = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export interface ColumnNameProps {
  seqName: string
  sequence?: AnalysisResult
  qc?: QCResult
}

export function ColumnName({ seqName, sequence, qc }: ColumnNameProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const id = getSafeId('sequence-label', { seqName })

  return (
    <SequenceName
      id={id}
      className="w-100"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {seqName}
      {sequence && (
        <Tooltip wide target={id} isOpen={showTooltip} placement="right-start">
          <ColumnNameTooltip sequence={sequence} />
        </Tooltip>
      )}
    </SequenceName>
  )
}
