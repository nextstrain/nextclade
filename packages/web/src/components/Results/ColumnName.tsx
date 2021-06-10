import React, { useState } from 'react'

import styled from 'styled-components'

import type { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

import { ColumnNameTooltip } from 'src/components/Results/ColumnNameTooltip'
import { Tooltip } from 'src/components/Results/Tooltip'
import { getStatusIconAndText } from 'src/components/Results/getStatusIconAndText'

export const SequenceName = styled.div`
  white-space: nowrap;
  overflow: hidden;
`

export interface ColumnNameProps {
  seqName: string
  sequence?: AnalysisResult
  warnings: string[]
  errors: string[]
}

export function ColumnName({ seqName, sequence, warnings, errors }: ColumnNameProps) {
  const { t } = useTranslationSafe()

  const [showTooltip, setShowTooltip] = useState(false)
  const id = getSafeId('sequence-label', { seqName })

  const { StatusIcon } = getStatusIconAndText({
    t,
    isDone: !!sequence,
    hasWarnings: warnings.length > 0,
    hasErrors: errors.length > 0,
  })

  return (
    <SequenceName
      id={id}
      className="w-100"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <StatusIcon />
      {seqName}
      {
        <Tooltip wide fullWidth target={id} isOpen={showTooltip} placement="right-start">
          <ColumnNameTooltip seqName={seqName} result={sequence} warnings={warnings} errors={errors} />
        </Tooltip>
      }
    </SequenceName>
  )
}
